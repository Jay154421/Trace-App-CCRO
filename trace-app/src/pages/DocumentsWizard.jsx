import { useParams, Link, useNavigate, useBlocker } from 'react-router-dom';
import { useState, useEffect, useRef, useLayoutEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { childrenApi } from '../services/api';
import { apiUrl } from '../config/api';

const PHOTO_ID_REQUIREMENT_ID = 'photo_2x2';
const FALLBACK_CAPTURE_SIZE = { width: 600, height: 600, label: '2 x 2 in' };
const FALLBACK_DOCUMENT_SCAN_SIZE = { width: 1240, height: 1754, label: 'Document scan' };

/** How long the red loading toast stays visible before auto-dismiss. */
const REMOVE_ATTACHMENT_LOADING_MS = 5000;

/** Custom red loading toast with animated spinner (auto-dismisses). */
function showRemoveAttachmentLoadingToast() {
  return toast.custom(
    (t) => (
      <div
        className={`flex max-w-md items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900 shadow-lg transition-opacity duration-300 ease-out ${
          t.visible ? 'opacity-100' : 'opacity-0'
        }`}
        role="status"
        aria-live="polite"
      >
        <span
          className="inline-block h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-red-600 border-t-transparent"
          aria-hidden
        />
        <span>Removing attachment…</span>
      </div>
    ),
    { duration: REMOVE_ATTACHMENT_LOADING_MS }
  );
}

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

function buildRequirementPhotoFilename(child, requirement) {
  if (requirement?.id === PHOTO_ID_REQUIREMENT_ID) {
    return buildPhotoFilename(child);
  }
  const owner = buildOwnerDisplayName(child)
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '') || 'owner';
  const requirementId = toSafeFilenamePart(requirement?.id) || 'requirement';
  return `${requirementId}_${owner}_${Date.now()}.jpg`;
}

function buildOwnerDisplayName(child) {
  const parts = [child?.first_name, child?.middle_name, child?.last_name]
    .map((p) => String(p || '').trim())
    .filter(Boolean);
  return parts.join(' ') || 'Owner';
}

function buildPhotoOutputLabel(child, filename) {
  const owner = buildOwnerDisplayName(child);
  const now = new Date();
  let month = now.toLocaleString('en-US', { month: 'long' });
  let day = String(now.getDate()).padStart(2, '0');
  let year = String(now.getFullYear());

  const namedDateMatch = filename.match(/_(January|February|March|April|May|June|July|August|September|October|November|December)-(\d{2})-(\d{4})(?:_\d+)?\.[^.]+$/i);
  if (namedDateMatch) {
    [, month, day, year] = namedDateMatch;
  } else {
    const timestampMatch = filename.match(/_(\d{13})_\d+\.[^.]+$/);
    if (timestampMatch) {
      const dt = new Date(Number(timestampMatch[1]));
      if (!Number.isNaN(dt.getTime())) {
        month = dt.toLocaleString('en-US', { month: 'long' });
        day = String(dt.getDate()).padStart(2, '0');
        year = String(dt.getFullYear());
      }
    }
  }

  return `${owner} ${month} ${day}, ${year}`;
}

const OUT_OF_TOWN_AFFIDAVIT_LABEL = 'Affidavit w/ Corroboration for Out-of-Town Applicant (Legal Office)';

function isIliganApplicant(child) {
  const placeOfBirth = typeof child?.place_of_birth === 'string' ? child.place_of_birth : '';
  const certificateCity = typeof child?.certificate_of_live_birth?.placeOfBirthCity === 'string'
    ? child.certificate_of_live_birth
      .placeOfBirthCity
    : '';
  const normalized = `${placeOfBirth} ${certificateCity}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return /\biligan\b/.test(normalized);
}

function buildChecklist(requirements, existing = [], child = null) {
  const byKey = new Map(existing.map((e) => [`${e.category}:${e.label}`, e]));
  const allRequirements = Array.isArray(requirements?.all) ? requirements.all : [];
  const normalizedRequirements = isIliganApplicant(child)
    ? allRequirements.filter((requirement) => requirement.label !== OUT_OF_TOWN_AFFIDAVIT_LABEL)
    : allRequirements;
  return normalizedRequirements.map((r) => {
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
      scannerCaptureSize: r.scannerCaptureSize || null,
    };
  });
}

function getNormalizedCaptureSize(item) {
  const width = Number(item?.scannerCaptureSize?.width);
  const height = Number(item?.scannerCaptureSize?.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return item?.id === PHOTO_ID_REQUIREMENT_ID ? FALLBACK_CAPTURE_SIZE : FALLBACK_DOCUMENT_SCAN_SIZE;
  }
  return {
    width: Math.round(width),
    height: Math.round(height),
    label: item?.scannerCaptureSize?.label || `${Math.round(width)} x ${Math.round(height)} px`,
  };
}

const MIN_CROP_NATURAL = 48;

function computeMaxCenteredCrop(iw, ih, targetAspect) {
  const srcAspect = iw / ih;
  let sw;
  let sh;
  if (srcAspect > targetAspect) {
    sh = ih;
    sw = sh * targetAspect;
  } else {
    sw = iw;
    sh = sw / targetAspect;
  }
  const sx = (iw - sw) / 2;
  const sy = (ih - sh) / 2;
  return { sx, sy, sw, sh };
}

function naturalRectToCropOverlayPx(rect, natural, layout) {
  const { sx, sy, sw, sh } = rect;
  const { w: iw, h: ih } = natural;
  return {
    left: layout.left + (sx / iw) * layout.width,
    top: layout.top + (sy / ih) * layout.height,
    width: (sw / iw) * layout.width,
    height: (sh / ih) * layout.height,
  };
}

function clampCropRect({ sx, sy, sw, sh }, iw, ih, targetAspect) {
  let w = Math.max(MIN_CROP_NATURAL, sw);
  let h = w / targetAspect;
  if (h > ih) {
    h = ih;
    w = h * targetAspect;
  }
  if (w > iw) {
    w = iw;
    h = w / targetAspect;
  }
  let x = Math.min(Math.max(0, sx), iw - w);
  let y = Math.min(Math.max(0, sy), ih - h);
  if (x + w > iw) x = iw - w;
  if (y + h > ih) y = ih - h;
  return { sx: x, sy: y, sw: w, sh: h };
}

/**
 * Fixed-aspect resize from pointer (natural image coords). mode: nw | ne | sw | se | n | s | e | w
 */
function cropRectFromResize(mode, mx, my, rect, iw, ih, k) {
  const mxC = Math.min(Math.max(0, mx), iw);
  const myC = Math.min(Math.max(0, my), ih);
  const { sx, sy, sw, sh } = rect;
  const brx = sx + sw;
  const bry = sy + sh;
  let next = { ...rect };

  switch (mode) {
    case 'move':
      return rect;
    case 'se': {
      let nw = mxC - sx;
      let nh = nw / k;
      next = { sx, sy, sw: nw, sh: nh };
      break;
    }
    case 'nw': {
      let nw = brx - mxC;
      let nh = nw / k;
      next = { sx: mxC, sy: bry - nh, sw: nw, sh: nh };
      break;
    }
    case 'ne': {
      let nw = mxC - sx;
      let nh = nw / k;
      next = { sx, sy: bry - nh, sw: nw, sh: nh };
      break;
    }
    case 'sw': {
      let nw = brx - mxC;
      let nh = nw / k;
      next = { sx: mxC, sy, sw: nw, sh: nh };
      break;
    }
    case 'n': {
      let nh = bry - myC;
      let nw = nh * k;
      next = {
        sx: sx + (sw - nw) / 2,
        sy: myC,
        sw: nw,
        sh: nh,
      };
      break;
    }
    case 's': {
      let nh = myC - sy;
      let nw = nh * k;
      next = {
        sx: sx + (sw - nw) / 2,
        sy,
        sw: nw,
        sh: nh,
      };
      break;
    }
    case 'e': {
      let nw = mxC - sx;
      let nh = nw / k;
      next = {
        sx,
        sy: sy + (sh - nh) / 2,
        sw: nw,
        sh: nh,
      };
      break;
    }
    case 'w': {
      let nw = brx - mxC;
      let nh = nw / k;
      next = {
        sx: mxC,
        sy: sy + (sh - nh) / 2,
        sw: nw,
        sh: nh,
      };
      break;
    }
    default:
      return rect;
  }
  return clampCropRect(next, iw, ih, k);
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
  /** Pending confirmation before removing an attachment (pending upload or saved file). */
  const [removeAttachmentModal, setRemoveAttachmentModal] = useState(null);
  const [initialChecklist, setInitialChecklist] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraTargetIndex, setCameraTargetIndex] = useState(null);
  const [rawCapturedFile, setRawCapturedFile] = useState(null);
  const [rawCapturedUrl, setRawCapturedUrl] = useState('');
  const [capturedPhotoFile, setCapturedPhotoFile] = useState(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState('');
  const [cropRectNatural, setCropRectNatural] = useState(null);
  const [naturalImageSize, setNaturalImageSize] = useState(null);
  const [cropImageLayout, setCropImageLayout] = useState(null);
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const [photoPreviewSrc, setPhotoPreviewSrc] = useState('');
  const [photoPreviewLocalUrl, setPhotoPreviewLocalUrl] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const cropStageRef = useRef(null);
  const cropImageRef = useRef(null);
  const cropDragRef = useRef(null);

  useEffect(() => {
    childrenApi
      .get(id)
      .then((data) => {
        setChild(data);
        const built = buildChecklist(data.requirements || { all: [] }, data.checklist || [], data);
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

  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) =>
        Boolean(hasUnsavedChanges) &&
        (currentLocation.pathname !== nextLocation.pathname ||
          currentLocation.search !== nextLocation.search ||
          currentLocation.hash !== nextLocation.hash),
      [hasUnsavedChanges]
    )
  );

  const handleBackClick = () => {
    navigate(`/children/${id}`);
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

  const removeSavedAttachmentFilename = (index, filename) => {
    setChecklist((prev) => {
      const next = [...prev];
      const currentItem = next[index];
      const names = (currentItem.attachmentFilenames || []).filter((f) => f !== filename);
      const hasAnyAttachment =
        (currentItem.attachmentFiles?.length ?? 0) > 0 || names.length > 0;
      next[index] = {
        ...currentItem,
        attachmentFilenames: names,
        checked: hasAnyAttachment ? 1 : 0,
      };
      return next;
    });
  };

  const confirmRemoveAttachment = () => {
    const m = removeAttachmentModal;
    if (!m) return;
    // Ensure old success/error toasts are not lingering on repeated deletes.
    toast.dismiss();
    showRemoveAttachmentLoadingToast();
    setRemoveAttachmentModal(null);
    if (m.kind === 'pending' && m.fileIndex !== undefined) {
      removeAttachmentFile(m.index, m.fileIndex);
    } else if (m.kind === 'saved' && m.filename) {
      removeSavedAttachmentFilename(m.index, m.filename);
    }
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
        const rebuilt = buildChecklist(refreshed.requirements || { all: [] }, refreshed.checklist || [], refreshed);
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
    save().then(() => {
      if (blocker.state === 'blocked') {
        blocker.proceed();
      }
    });
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
    if (rawCapturedUrl) {
      URL.revokeObjectURL(rawCapturedUrl);
      setRawCapturedUrl('');
      setRawCapturedFile(null);
    }
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
    if (rawCapturedUrl) {
      URL.revokeObjectURL(rawCapturedUrl);
    }
    if (capturedPhotoUrl) {
      URL.revokeObjectURL(capturedPhotoUrl);
    }
    setCameraOpen(false);
    setCameraBusy(false);
    setCameraError('');
    setCameraTargetIndex(null);
    setRawCapturedFile(null);
    setRawCapturedUrl('');
    setCapturedPhotoFile(null);
    setCapturedPhotoUrl('');
    setCropRectNatural(null);
    setNaturalImageSize(null);
    setCropImageLayout(null);
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
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setCameraError('Unable to process captured image.');
      return;
    }
    ctx.drawImage(video, 0, 0, width, height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) {
      setCameraError('Failed to capture image.');
      return;
    }
    const file = new File([blob], `raw_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
    if (rawCapturedUrl) URL.revokeObjectURL(rawCapturedUrl);
    if (capturedPhotoUrl) URL.revokeObjectURL(capturedPhotoUrl);
    setRawCapturedFile(file);
    setRawCapturedUrl(URL.createObjectURL(file));
    setCapturedPhotoFile(null);
    setCapturedPhotoUrl('');
    setCropRectNatural(null);
    setNaturalImageSize(null);
    setCropImageLayout(null);
    setCameraError('');
    stopCamera();
  };

  const saveCroppedPhoto = async () => {
    if (!rawCapturedFile || cameraTargetIndex === null || !cropRectNatural || !naturalImageSize) return;
    const targetItem = checklist[cameraTargetIndex];
    const captureSize = getNormalizedCaptureSize(targetItem);

    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load captured image.'));
      img.src = rawCapturedUrl;
    });

    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;
    const targetAspect = captureSize.width / captureSize.height;
    const r = clampCropRect(cropRectNatural, imageWidth, imageHeight, targetAspect);
    const sx = Math.floor(r.sx);
    const sy = Math.floor(r.sy);
    const cropWidth = Math.max(1, Math.floor(r.sw));
    const cropHeight = Math.max(1, Math.floor(r.sh));

    const canvas = document.createElement('canvas');
    canvas.width = captureSize.width;
    canvas.height = captureSize.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setCameraError('Unable to process cropped image.');
      return;
    }

    ctx.drawImage(image, sx, sy, cropWidth, cropHeight, 0, 0, captureSize.width, captureSize.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) {
      setCameraError('Failed to save cropped image.');
      return;
    }

    const file = new File([blob], buildRequirementPhotoFilename(child, targetItem), { type: 'image/jpeg' });
    if (capturedPhotoUrl) URL.revokeObjectURL(capturedPhotoUrl);
    setCapturedPhotoFile(file);
    setCapturedPhotoUrl(URL.createObjectURL(file));
    setCameraError('');
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

  const cameraTargetAspect = useMemo(() => {
    if (cameraTargetIndex === null || !checklist[cameraTargetIndex]) return 1;
    const s = getNormalizedCaptureSize(checklist[cameraTargetIndex]);
    return s.width / s.height;
  }, [cameraTargetIndex, checklist]);

  const updateCropLayout = useCallback(() => {
    const stage = cropStageRef.current;
    const img = cropImageRef.current;
    if (!stage || !img || !naturalImageSize) return;
    const sr = stage.getBoundingClientRect();
    const ir = img.getBoundingClientRect();
    setCropImageLayout({
      left: ir.left - sr.left,
      top: ir.top - sr.top,
      width: ir.width,
      height: ir.height,
    });
  }, [naturalImageSize]);

  useEffect(() => {
    if (!rawCapturedUrl || cameraTargetIndex === null) {
      setNaturalImageSize(null);
      setCropRectNatural(null);
      return;
    }
    const targetItem = checklist[cameraTargetIndex];
    const captureSize = getNormalizedCaptureSize(targetItem);
    const targetAspect = captureSize.width / captureSize.height;
    const img = new Image();
    img.onload = () => {
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      setNaturalImageSize({ w: iw, h: ih });
      setCropRectNatural(computeMaxCenteredCrop(iw, ih, targetAspect));
    };
    img.src = rawCapturedUrl;
    return () => {
      img.onload = null;
    };
  }, [rawCapturedUrl, cameraTargetIndex, checklist]);

  useLayoutEffect(() => {
    updateCropLayout();
  }, [rawCapturedUrl, naturalImageSize, cropRectNatural, updateCropLayout]);

  useEffect(() => {
    const stage = cropStageRef.current;
    if (!stage) return;
    const ro = new ResizeObserver(() => updateCropLayout());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [updateCropLayout]);

  const clientToNatural = useCallback(
    (clientX, clientY) => {
      const stage = cropStageRef.current;
      if (!stage || !naturalImageSize || !cropImageLayout) return { nx: 0, ny: 0 };
      const { width: lw, height: lh } = cropImageLayout;
      if (lw <= 0 || lh <= 0) return { nx: 0, ny: 0 };
      const sr = stage.getBoundingClientRect();
      const relX = Math.min(Math.max(0, clientX - sr.left - cropImageLayout.left), lw);
      const relY = Math.min(Math.max(0, clientY - sr.top - cropImageLayout.top), lh);
      const { w: iw, h: ih } = naturalImageSize;
      return {
        nx: (relX / lw) * iw,
        ny: (relY / lh) * ih,
      };
    },
    [naturalImageSize, cropImageLayout]
  );

  const endCropDrag = useCallback(() => {
    const d = cropDragRef.current;
    if (d?.captureEl && d.pointerId != null) {
      try {
        d.captureEl.releasePointerCapture(d.pointerId);
      } catch {
        /* ignore */
      }
    }
    cropDragRef.current = null;
  }, []);

  const onCropPointerMove = useCallback(
    (e) => {
      const d = cropDragRef.current;
      if (!d || !naturalImageSize || !cropImageLayout) return;
      const { w: iw, h: ih } = naturalImageSize;
      const k = cameraTargetAspect;
      const { nx, ny } = clientToNatural(e.clientX, e.clientY);

      if (d.mode === 'move') {
        const dx = (e.clientX - d.startClientX) * (iw / cropImageLayout.width);
        const dy = (e.clientY - d.startClientY) * (ih / cropImageLayout.height);
        setCropRectNatural(
          clampCropRect(
            {
              sx: d.startRect.sx + dx,
              sy: d.startRect.sy + dy,
              sw: d.startRect.sw,
              sh: d.startRect.sh,
            },
            iw,
            ih,
            k
          )
        );
        return;
      }

      setCropRectNatural(cropRectFromResize(d.mode, nx, ny, d.startRect, iw, ih, k));
    },
    [naturalImageSize, cropImageLayout, clientToNatural, cameraTargetAspect]
  );

  const onCropPointerUp = useCallback(
    (e) => {
      if (cropDragRef.current?.pointerId === e.pointerId) {
        endCropDrag();
      }
    },
    [endCropDrag]
  );

  useEffect(() => {
    const onMove = (e) => onCropPointerMove(e);
    const onUp = (e) => onCropPointerUp(e);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [onCropPointerMove, onCropPointerUp]);

  const cropOverlayPx = useMemo(() => {
    if (!cropRectNatural || !naturalImageSize || !cropImageLayout) return null;
    return naturalRectToCropOverlayPx(cropRectNatural, naturalImageSize, cropImageLayout);
  }, [cropRectNatural, naturalImageSize, cropImageLayout]);

  const startCropDrag = (mode, e) => {
    if (!cropRectNatural || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    cropDragRef.current = {
      mode,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startRect: { ...cropRectNatural },
      captureEl: e.currentTarget,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
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

  const openSavedAttachment = async (filename) => {
    const fileUrl = apiUrl(`/children/${id}/attachments/${encodeURIComponent(filename)}`);
    if (isImageFilename(filename)) {
      try {
        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error('Failed to load image');
        const blob = await res.blob();
        const localUrl = URL.createObjectURL(blob);
        open2x2Preview(localUrl, true);
      } catch {
        open2x2Preview(fileUrl);
      }
      return;
    }
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => () => {
    stopCamera();
    if (rawCapturedUrl) URL.revokeObjectURL(rawCapturedUrl);
    if (capturedPhotoUrl) URL.revokeObjectURL(capturedPhotoUrl);
    if (photoPreviewLocalUrl) URL.revokeObjectURL(photoPreviewLocalUrl);
  }, [rawCapturedUrl, capturedPhotoUrl, photoPreviewLocalUrl]);

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
  const cameraTargetItem = cameraTargetIndex !== null ? checklist[cameraTargetIndex] : null;
  const activeCaptureSize = getNormalizedCaptureSize(cameraTargetItem);
  const activeCaptureAspect = `${activeCaptureSize.width} / ${activeCaptureSize.height}`;
  const isPhotoCameraTarget = cameraTargetItem?.id === PHOTO_ID_REQUIREMENT_ID;

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
            const allowCameraCapture = item.id === PHOTO_ID_REQUIREMENT_ID;
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
                      {allowCameraCapture ? (
                        <button
                          type="button"
                          onClick={() => openCameraForItem(globalIndex)}
                          className="inline-flex items-center gap-1 rounded border border-blue-300 bg-blue-50 px-2 py-1.5 text-sm text-blue-700 hover:bg-blue-100"
                        >
                          Take Picture
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openCameraForItem(globalIndex)}
                          className="inline-flex items-center gap-1 rounded border border-sky-300 bg-sky-50 px-2 py-1.5 text-sm text-sky-700 hover:bg-sky-100"
                        >
                          Scan Document
                        </button>
                      )}
                      {(item.attachmentFiles || []).map((file, fi) => (
                        <span
                          key={`${file.name}-${fi}`}
                          className="inline-flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-sm"
                        >
                          <button
                            type="button"
                            onClick={() => openLocalAttachment(file)}
                            className="max-w-[12rem] truncate text-left text-blue-700 hover:underline"
                            aria-label={`Open ${file.name}`}
                          >
                            {file.name}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setRemoveAttachmentModal({
                                kind: 'pending',
                                index: globalIndex,
                                fileIndex: fi,
                                displayName: file.name,
                              })
                            }
                            className="shrink-0 rounded border border-red-200 bg-white px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-50"
                            aria-label={`Remove ${file.name}`}
                          >
                            Remove
                          </button>
                        </span>
                      ))}
                      {(item.attachmentFilenames || []).map((filename, fi) => (
                        <span
                          key={`${filename}-${fi}`}
                          className="inline-flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-sm"
                        >
                          <button
                            type="button"
                            onClick={() => openSavedAttachment(filename)}
                            className="max-w-[12rem] truncate text-left text-emerald-700 hover:underline"
                          >
                            View{' '}
                            {item.id === PHOTO_ID_REQUIREMENT_ID ? buildPhotoOutputLabel(child, filename) : filename}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setRemoveAttachmentModal({
                                kind: 'saved',
                                index: globalIndex,
                                filename,
                                displayName:
                                  item.id === PHOTO_ID_REQUIREMENT_ID
                                    ? buildPhotoOutputLabel(child, filename)
                                    : filename,
                              })
                            }
                            className="shrink-0 rounded border border-red-200 bg-white px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-50"
                            aria-label={`Remove attachment ${filename}`}
                          >
                            Remove
                          </button>
                        </span>
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

      {removeAttachmentModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50"
          onClick={() => setRemoveAttachmentModal(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-attachment-modal-title"
        >
          <div
            className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="remove-attachment-modal-title" className="text-lg font-semibold text-slate-800">
              Remove attachment?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-medium text-slate-800">{removeAttachmentModal.displayName}</span>
              {removeAttachmentModal.kind === 'pending'
                ? ' will be removed from this requirement. It is not saved until you save the checklist.'
                : ' will be removed from this requirement. Save the checklist to apply this change permanently.'}
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setRemoveAttachmentModal(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemoveAttachment}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {blocker.state === 'blocked' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          onClick={() => blocker.reset()}
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
                onClick={() => saveAndLeave()}
                className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => blocker.reset()}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                Stay on Page
              </button>
              <button
                type="button"
                onClick={() => blocker.proceed()}
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
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 ${
            isPhotoCameraTarget ? 'overflow-y-auto' : 'overflow-hidden'
          }`}
          onClick={closeCamera}
          role="dialog"
          aria-modal="true"
          aria-labelledby="camera-modal-title"
        >
          <div
            className={`my-4 w-full rounded-xl border border-slate-200 bg-white p-5 shadow-lg ${
              isPhotoCameraTarget
                ? 'max-h-[90vh] max-w-xl overflow-y-auto'
                : 'flex h-[min(90vh,780px)] max-w-4xl flex-col'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="camera-modal-title" className="text-lg font-semibold text-slate-800">
              Capture {cameraTargetItem?.label || 'Requirement Photo'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Scanner capture size: {activeCaptureSize.label} ({activeCaptureSize.width} x {activeCaptureSize.height} px)
            </p>
            <div
              className={`mt-3 overflow-hidden rounded-lg border border-slate-200 bg-black ${
                isPhotoCameraTarget ? '' : 'h-[min(62vh,560px)] min-h-[300px]'
              }`}
            >
              {capturedPhotoUrl ? (
                <img
                  src={capturedPhotoUrl}
                  alt="Captured preview"
                  className={isPhotoCameraTarget ? 'w-full object-cover' : 'h-full w-full object-contain'}
                  style={isPhotoCameraTarget ? { aspectRatio: activeCaptureAspect } : undefined}
                />
              ) : rawCapturedUrl ? (
                <div
                  ref={cropStageRef}
                  className={`relative flex w-full items-center justify-center bg-neutral-900 ${
                    isPhotoCameraTarget ? 'min-h-[280px] max-h-[min(60vh,520px)]' : 'h-full'
                  }`}
                >
                  <img
                    ref={cropImageRef}
                    src={rawCapturedUrl}
                    alt="Crop source"
                    draggable={false}
                    className={`w-full select-none object-contain pointer-events-none ${
                      isPhotoCameraTarget ? 'max-h-[min(60vh,520px)]' : 'h-full'
                    }`}
                    onLoad={updateCropLayout}
                  />
                  {cropOverlayPx && (
                    <div className="absolute inset-0 z-10 pointer-events-none">
                      <div
                        role="presentation"
                        className="absolute z-20 touch-none border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] pointer-events-auto cursor-move"
                        style={{
                          left: cropOverlayPx.left,
                          top: cropOverlayPx.top,
                          width: cropOverlayPx.width,
                          height: cropOverlayPx.height,
                        }}
                        onPointerDown={(e) => startCropDrag('move', e)}
                      >
                        <svg
                          className="pointer-events-none absolute inset-0 h-full w-full"
                          aria-hidden
                        >
                          <line x1="33.33%" y1="0" x2="33.33%" y2="100%" stroke="rgba(255,255,255,0.85)" strokeWidth="1" />
                          <line x1="66.67%" y1="0" x2="66.67%" y2="100%" stroke="rgba(255,255,255,0.85)" strokeWidth="1" />
                          <line x1="0" y1="33.33%" x2="100%" y2="33.33%" stroke="rgba(255,255,255,0.85)" strokeWidth="1" />
                          <line x1="0" y1="66.67%" x2="100%" y2="66.67%" stroke="rgba(255,255,255,0.85)" strokeWidth="1" />
                        </svg>
                        <div
                          className="pointer-events-none absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2"
                          aria-hidden
                        >
                          <div className="absolute left-1/2 top-0 h-2 w-px -translate-x-1/2 bg-white/90" />
                          <div className="absolute left-0 top-1/2 h-px w-2 -translate-y-1/2 bg-white/90" />
                          <div className="absolute bottom-0 left-1/2 h-2 w-px -translate-x-1/2 bg-white/90" />
                          <div className="absolute right-0 top-1/2 h-px w-2 -translate-y-1/2 bg-white/90" />
                        </div>
                        {/* Corner L-handles */}
                        <button
                          type="button"
                          aria-label="Resize crop north-west"
                          className="absolute -left-1 -top-1 z-30 h-8 w-8 cursor-nwse-resize border-l-[3px] border-t-[3px] border-white bg-transparent p-0 pointer-events-auto"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            startCropDrag('nw', e);
                          }}
                        />
                        <button
                          type="button"
                          aria-label="Resize crop north-east"
                          className="absolute -right-1 -top-1 z-30 h-8 w-8 cursor-nesw-resize border-r-[3px] border-t-[3px] border-white bg-transparent p-0 pointer-events-auto"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            startCropDrag('ne', e);
                          }}
                        />
                        <button
                          type="button"
                          aria-label="Resize crop south-west"
                          className="absolute -bottom-1 -left-1 z-30 h-8 w-8 cursor-nesw-resize border-b-[3px] border-l-[3px] border-white bg-transparent p-0 pointer-events-auto"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            startCropDrag('sw', e);
                          }}
                        />
                        <button
                          type="button"
                          aria-label="Resize crop south-east"
                          className="absolute -bottom-1 -right-1 z-30 h-8 w-8 cursor-nwse-resize border-b-[3px] border-r-[3px] border-white bg-transparent p-0 pointer-events-auto"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            startCropDrag('se', e);
                          }}
                        />
                        {/* Edge handles */}
                        <button
                          type="button"
                          aria-label="Resize crop top edge"
                          className="absolute -top-1.5 left-1/2 z-30 h-4 w-10 -translate-x-1/2 cursor-ns-resize border-2 border-white bg-white/20 pointer-events-auto"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            startCropDrag('n', e);
                          }}
                        />
                        <button
                          type="button"
                          aria-label="Resize crop bottom edge"
                          className="absolute -bottom-1.5 left-1/2 z-30 h-4 w-10 -translate-x-1/2 cursor-ns-resize border-2 border-white bg-white/20 pointer-events-auto"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            startCropDrag('s', e);
                          }}
                        />
                        <button
                          type="button"
                          aria-label="Resize crop left edge"
                          className="absolute -left-1.5 top-1/2 z-30 h-10 w-4 -translate-y-1/2 cursor-ew-resize border-2 border-white bg-white/20 pointer-events-auto"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            startCropDrag('w', e);
                          }}
                        />
                        <button
                          type="button"
                          aria-label="Resize crop right edge"
                          className="absolute -right-1.5 top-1/2 z-30 h-10 w-4 -translate-y-1/2 cursor-ew-resize border-2 border-white bg-white/20 pointer-events-auto"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            startCropDrag('e', e);
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <video
                  ref={videoRef}
                  className={isPhotoCameraTarget ? 'w-full object-cover' : 'h-full w-full object-contain'}
                  style={isPhotoCameraTarget ? { aspectRatio: activeCaptureAspect } : undefined}
                  playsInline
                  muted
                />
              )}
            </div>
            {rawCapturedUrl && !capturedPhotoUrl && (
              <p className="mt-2 text-xs text-slate-600">
                Drag the frame to move, or drag corners and edges to resize. Output keeps scanner aspect (
                {activeCaptureSize.width}×{activeCaptureSize.height} px). Then tap <strong>Crop</strong>.
              </p>
            )}
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
              ) : rawCapturedUrl ? (
                <>
                  <button
                    type="button"
                    onClick={saveCroppedPhoto}
                    disabled={cameraBusy || !cropRectNatural || !naturalImageSize}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Crop
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
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60"
          onClick={closePhotoPreview}
          role="dialog"
          aria-modal="true"
          aria-labelledby="photo-preview-title"
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="my-auto w-full max-w-xl max-h-[min(90vh,calc(100vh-2rem))] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="photo-preview-title" className="text-lg font-semibold text-slate-800">
                Preview
              </h2>
              <div className="mt-4 flex justify-center">
                <div className="relative rounded-lg border border-slate-300 bg-white p-6">
                  <img
                    src={photoPreviewSrc}
                    alt="2x2 uploaded preview"
                    className="block border border-slate-300 bg-white object-cover"
                  />
                </div>
              </div>

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
        </div>
      )}
    </div>
  );
}
