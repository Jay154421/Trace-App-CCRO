import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { childrenApi } from '../services/api';
import { apiUrl } from '../config/api';

const PHOTO_ID_LABEL = '2x2 Photo I.D. with white background (studio copy: 1, out-of-town: 2)';

function parseAttachments(attachment) {
  if (!attachment) return [];
  if (typeof attachment === 'string' && attachment.startsWith('[')) {
    try {
      return JSON.parse(attachment);
    } catch {
      return [attachment];
    }
  }
  return [attachment];
}

function hasAnyAttachments(item) {
  return (item.attachmentFiles?.length ?? 0) > 0 || (item.attachmentFilenames?.length ?? 0) > 0;
}

function toSafeFilenamePart(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '');
}

function buildPhotoFilename(child) {
  const firstName = toSafeFilenamePart(child?.first_name);
  const middleName = toSafeFilenamePart(child?.middle_name);
  const lastName = toSafeFilenamePart(child?.last_name);
  const ownerName = [firstName, middleName, lastName].filter(Boolean).join('_') || 'owner';
  const now = new Date();
  const month = now.toLocaleString('en-US', { month: 'long' });
  const day = String(now.getDate()).padStart(2, '0');
  const year = now.getFullYear();
  return `${ownerName}_${month}-${day}-${year}.jpg`;
}

function buildChecklist(requirements, existing = []) {
  const byKey = new Map(existing.map((e) => [`${e.category}:${e.label}`, e]));
  return requirements.all.map((r) => {
    const existingItem = byKey.get(`${r.category}:${r.label}`);
    const attachmentList = parseAttachments(existingItem?.attachment);
    return {
      category: r.category,
      label: r.label,
      id: r.id,
      required: true,
      checked: attachmentList.length > 0 ? 1 : 0,
      notes: existingItem?.notes ?? '',
      attachmentFilenames: attachmentList,
      attachmentFiles: [],
    };
  });
}

export function DocumentsWizard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(0);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [initialChecklist, setInitialChecklist] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraTargetIndex, setCameraTargetIndex] = useState(null);
  const [capturedPhotoFile, setCapturedPhotoFile] = useState(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState('');
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const [photoPreviewSrc, setPhotoPreviewSrc] = useState('');
  const [photoPreviewLocalUrl, setPhotoPreviewLocalUrl] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    childrenApi
      .get(id)
      .then((data) => {
        setChild(data);
        const built = buildChecklist(data.requirements || { all: [] }, data.checklist || []);
        setChecklist(built);
        setInitialChecklist(built);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id]);

  const hasUnsavedChanges = initialChecklist && checklist.some((curr, i) => {
    const init = initialChecklist[i];
    if (!init) return true;
    const notesChanged = (curr.notes ?? '') !== (init.notes ?? '');
    const checkedChanged = !!curr.checked !== !!init.checked;
    const hasNewFiles = (curr.attachmentFiles?.length ?? 0) > 0;
    return notesChanged || checkedChanged || hasNewFiles;
  });

  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      setLeaveModalOpen(true);
    } else {
      navigate(`/children/${id}`);
    }
  };

  const updateNotes = (index, notes) => {
    setChecklist((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], notes };
      return next;
    });
  };

  const addAttachmentFiles = (index, files) => {
    const fileList = files ? Array.from(files) : [];
    if (fileList.length === 0) return;
    setChecklist((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        attachmentFiles: [...(next[index].attachmentFiles || []), ...fileList],
        checked: 1,
      };
      return next;
    });
  };

  const removeAttachmentFile = (index, fileIndex) => {
    setChecklist((prev) => {
      const next = [...prev];
      const currentItem = next[index];
      const current = currentItem.attachmentFiles || [];
      const updatedFiles = current.filter((_, i) => i !== fileIndex);
      const hasAnyAttachment = updatedFiles.length > 0 || (currentItem.attachmentFilenames?.length ?? 0) > 0;
      next[index] = {
        ...currentItem,
        attachmentFiles: updatedFiles,
        checked: hasAnyAttachment ? 1 : 0,
      };
      return next;
    });
  };

  const save = async () => {
    if (!id) {
      toast.error('Missing applicant ID.');
      return;
    }
    setSaving(true);
    const items = await Promise.all(
      checklist.map(async (c) => {
        const item = {
          category: c.category || 'general',
          label: c.label || '',
          required: Boolean(c.required),
          checked: hasAnyAttachments(c),
          notes: c.notes ?? '',
          attachmentFilenames: c.attachmentFilenames || [],
        };
        const newFiles = c.attachmentFiles || [];
        if (newFiles.length > 0) {
          item.attachments = await Promise.all(
            newFiles.map(async (file) => ({
              attachmentBase64: await fileToBase64(file),
              attachmentFilename: file.name,
            }))
          );
        }
        return item;
      })
    );
    return childrenApi
      .updateChecklist(id, items)
      .then(async () => {
        const refreshed = await childrenApi.get(id);
        setChild(refreshed);
        const rebuilt = buildChecklist(refreshed.requirements || { all: [] }, refreshed.checklist || []);
        setChecklist(rebuilt);
        setInitialChecklist(rebuilt);
        toast.success('Checklist saved.');
      })
      .catch((err) => {
        toast.error(err?.message || 'Failed to save checklist.');
        throw err;
      })
      .finally(() => setSaving(false));
  };

  const saveAndLeave = () => {
    save().then(() => navigate(`/children/${id}`));
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async () => {
    setCameraBusy(true);
    setCameraError('');
    if (capturedPhotoUrl) {
      URL.revokeObjectURL(capturedPhotoUrl);
      setCapturedPhotoUrl('');
      setCapturedPhotoFile(null);
    }
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      setCameraError(err?.message || 'Unable to access camera.');
    } finally {
      setCameraBusy(false);
    }
  };

  const openCameraForItem = async (index) => {
    setCameraTargetIndex(index);
    setCameraOpen(true);
    await startCamera();
  };

  const closeCamera = () => {
    stopCamera();
    if (capturedPhotoUrl) {
      URL.revokeObjectURL(capturedPhotoUrl);
    }
    setCameraOpen(false);
    setCameraBusy(false);
    setCameraError('');
    setCameraTargetIndex(null);
    setCapturedPhotoFile(null);
    setCapturedPhotoUrl('');
  };

  const capturePhoto = async () => {
    if (cameraTargetIndex === null || !videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      setCameraError('Camera not ready. Please retry.');
      return;
    }
    const side = Math.min(width, height);
    const sx = Math.floor((width - side) / 2);
    const sy = Math.floor((height - side) / 2);
    const outputSize = 600;
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setCameraError('Unable to process captured image.');
      return;
    }
    ctx.drawImage(video, sx, sy, side, side, 0, 0, outputSize, outputSize);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) {
      setCameraError('Failed to capture image.');
      return;
    }
    const file = new File([blob], buildPhotoFilename(child), { type: 'image/jpeg' });
    if (capturedPhotoUrl) URL.revokeObjectURL(capturedPhotoUrl);
    setCapturedPhotoFile(file);
    setCapturedPhotoUrl(URL.createObjectURL(file));
    stopCamera();
  };

  const attachCapturedPhoto = () => {
    if (cameraTargetIndex === null || !capturedPhotoFile) return;
    addAttachmentFiles(cameraTargetIndex, [capturedPhotoFile]);
    toast.success('Photo attached.');
    closeCamera();
  };

  const retakePhoto = async () => {
    await startCamera();
  };

  const isImageFilename = (filename = '') => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(filename);

  const open2x2Preview = (src, isLocal = false) => {
    if (photoPreviewLocalUrl) {
      URL.revokeObjectURL(photoPreviewLocalUrl);
      setPhotoPreviewLocalUrl('');
    }
    if (isLocal) {
      setPhotoPreviewLocalUrl(src);
    }
    setPhotoPreviewSrc(src);
    setPhotoPreviewOpen(true);
  };

  const closePhotoPreview = () => {
    setPhotoPreviewOpen(false);
    setPhotoPreviewSrc('');
    if (photoPreviewLocalUrl) {
      URL.revokeObjectURL(photoPreviewLocalUrl);
      setPhotoPreviewLocalUrl('');
    }
  };

  const openLocalAttachment = (file) => {
    const objectUrl = URL.createObjectURL(file);
    if (file.type.startsWith('image/')) open2x2Preview(objectUrl, true);
    else {
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
    }
  };

  const openSavedAttachment = (filename) => {
    const fileUrl = apiUrl(`/children/${id}/attachments/${encodeURIComponent(filename)}`);
    if (isImageFilename(filename)) {
      open2x2Preview(fileUrl);
      return;
    }
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => () => {
    stopCamera();
    if (capturedPhotoUrl) URL.revokeObjectURL(capturedPhotoUrl);
    if (photoPreviewLocalUrl) URL.revokeObjectURL(photoPreviewLocalUrl);
  }, [capturedPhotoUrl, photoPreviewLocalUrl]);

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (error) return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">{error.message}</div>;
  if (!child) return null;

  const steps = [
    { name: 'General documents', items: checklist.filter((c) => c.category === 'general') },
    { name: 'Age-specific requirements', items: checklist.filter((c) => c.category === 'age_specific') },
    { name: 'Conditional documents', items: checklist.filter((c) => c.category === 'conditional') },
  ].filter((s) => s.items.length > 0);

  const currentStep = steps[step];
  const progress = checklist.length
    ? checklist.filter((c) => c.checked).length / checklist.length
    : 0;

  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleBackClick}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← Back to applicant
          </button>
          <Link to={`/children/${id}/certificate-of-live-birth`} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">Certificate of Live Birth</Link>
        </div>
        <h1 className="text-2xl font-semibold text-slate-800 mt-2">
          Document checklist: {child.first_name} {child.last_name}
        </h1>
        <p className="text-slate-600 mt-1">
          Age group: {child.age_group?.replace(/_/g, ' ')} · {Math.round(progress * 100)}% complete
        </p>
      </div>

      <div className="mb-4 h-2 w-full rounded-full bg-slate-200 overflow-hidden" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-emerald-600 transition-all" style={{ width: `${progress * 100}%` }} />
      </div>

      {steps.length > 1 && (
        <nav className="flex gap-2 mb-6" aria-label="Checklist steps">
          {steps.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                step === i ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {s.name}
            </button>
          ))}
        </nav>
      )}

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <h2 className="sr-only">{currentStep?.name}</h2>
        <ul className="divide-y divide-slate-200">
          {(currentStep?.items || []).map((item) => {
            const globalIndex = checklist.findIndex((c) => c.label === item.label && c.category === item.category);
            const allowCameraCapture = item.label === PHOTO_ID_LABEL;
            return (
              <li key={`${item.category}-${item.id}`} className="px-5 py-4">
                <div className="flex gap-3">
                  <input
                    type="checkbox"
                    id={`check-${globalIndex}`}
                    checked={hasAnyAttachments(item)}
                    onChange={() => {}}
                    readOnly
                    tabIndex={-1}
                    aria-disabled="true"
                    style={{ accentColor: '#2563eb' }}
                    className="mt-1 h-4 w-4 rounded border-slate-300 accent-blue-600 pointer-events-none"
                    aria-label={`Mark ${item.label} as provided`}
                  />
                  <div className="flex-1 min-w-0">
                    <label htmlFor={`check-${globalIndex}`} className="font-medium text-slate-800 cursor-pointer">
                      {item.label}
                    </label>
                    <input
                      type="text"
                      placeholder="Notes (optional)"
                      value={item.notes}
                      onChange={(e) => updateNotes(globalIndex, e.target.value)}
                      className="mt-1 block w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-1 rounded border border-slate-300 bg-slate-50 px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer">
                        <span className="sr-only">Attach files for {item.label}</span>
                        <input
                          type="file"
                          className="sr-only"
                          multiple
                          onChange={(e) => {
                            addAttachmentFiles(globalIndex, e.target.files);
                            e.target.value = '';
                          }}
                        />
                        Attach file(s)
                      </label>
                      {allowCameraCapture && (
                        <button
                          type="button"
                          onClick={() => openCameraForItem(globalIndex)}
                          className="inline-flex items-center gap-1 rounded border border-blue-300 bg-blue-50 px-2 py-1.5 text-sm text-blue-700 hover:bg-blue-100"
                        >
                          Take Picture
                        </button>
                      )}
                      {(item.attachmentFiles || []).map((file, fi) => (
                        <span key={fi} className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-sm">
                          <button
                            type="button"
                            onClick={() => openLocalAttachment(file)}
                            className="text-blue-700 hover:underline"
                            aria-label={`Open ${file.name}`}
                          >
                            {file.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeAttachmentFile(globalIndex, fi)}
                            className="text-slate-500 hover:text-red-600"
                            aria-label={`Remove ${file.name}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {(item.attachmentFilenames || []).map((filename, fi) => (
                        <button
                          type="button"
                          key={fi}
                          onClick={() => openSavedAttachment(filename)}
                          className="text-sm text-emerald-600 hover:underline"
                        >
                          View {filename}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save checklist'}
        </button>
        <button
          type="button"
          onClick={handleBackClick}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Back to applicant
        </button>
      </div>

      {leaveModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          onClick={() => setLeaveModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-modal-title"
        >
          <div
            className="bg-white rounded-xl border border-slate-200 shadow-lg w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="leave-modal-title" className="text-lg font-semibold text-slate-800">
              Save changes?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              You are leaving the page without saving your changes.
            </p>
            <div className="flex flex-col gap-3 mt-5">
              <button
                type="button"
                onClick={() => {
                  setLeaveModalOpen(false);
                  saveAndLeave();
                }}
                className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setLeaveModalOpen(false)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                Stay on Page
              </button>
              <button
                type="button"
                onClick={() => {
                  setLeaveModalOpen(false);
                  navigate(`/children/${id}`);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {cameraOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60"
          onClick={closeCamera}
          role="dialog"
          aria-modal="true"
          aria-labelledby="camera-modal-title"
        >
          <div
            className="bg-white rounded-xl border border-slate-200 shadow-lg w-full max-w-xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="camera-modal-title" className="text-lg font-semibold text-slate-800">
              Capture 2x2 Photo I.D.
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Capture first, preview it, then attach if clear.
            </p>
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-black">
              {capturedPhotoUrl ? (
                <img src={capturedPhotoUrl} alt="Captured preview" className="w-full aspect-square object-cover" />
              ) : (
                <video ref={videoRef} className="w-full aspect-square object-cover" playsInline muted />
              )}
            </div>
            {cameraError && <p className="mt-2 text-sm text-red-600">{cameraError}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              {capturedPhotoUrl ? (
                <>
                  <button
                    type="button"
                    onClick={attachCapturedPhoto}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Attach Photo
                  </button>
                  <button
                    type="button"
                    onClick={retakePhoto}
                    disabled={cameraBusy}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Retake Photo
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    disabled={cameraBusy}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Capture Preview
                  </button>
                  <button
                    type="button"
                    onClick={startCamera}
                    disabled={cameraBusy}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Retry Camera
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={closeCamera}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {photoPreviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60"
          onClick={closePhotoPreview}
          role="dialog"
          aria-modal="true"
          aria-labelledby="photo-preview-title"
        >
          <div
            className="bg-white rounded-xl border border-slate-200 shadow-lg w-full max-w-xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="photo-preview-title" className="text-lg font-semibold text-slate-800">
              2x2 Photo Preview
            </h2>
            <div className="mt-4 flex justify-center">
              <div className="relative rounded-lg border border-slate-300 bg-white p-6">
                <span className="absolute left-1/2 top-2 -translate-x-1/2 rounded border border-slate-400 bg-indigo-50 px-1.5 py-0.5 text-xs font-semibold text-slate-700">
                  2 in
                </span>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-slate-400 bg-indigo-50 px-1.5 py-0.5 text-xs font-semibold text-slate-700">
                  2 in
                </span>
                <img
                  src={photoPreviewSrc}
                  alt="2x2 uploaded preview"
                  className="block border border-slate-300 bg-white object-cover"
                  style={{ width: '2in', height: '2in' }}
                />
              </div>
            </div>
            <p className="mt-4 text-center text-sm text-slate-600">
              2in x 2in (51 x 51 mm / 5.1 x 5.1 cm)
            </p>
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={closePhotoPreview}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
