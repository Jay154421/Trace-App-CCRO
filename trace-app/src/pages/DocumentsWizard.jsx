import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { childrenApi } from '../services/api';
import { apiUrl } from '../config/api';

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
      checked: existingItem?.checked ?? 0,
      notes: existingItem?.notes ?? '',
      attachmentFilenames: attachmentList,
      attachmentFiles: [],
    };
  });
}

export function DocumentsWizard() {
  const { id } = useParams();
  const [child, setChild] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    childrenApi
      .get(id)
      .then((data) => {
        setChild(data);
        setChecklist(buildChecklist(data.requirements || { all: [] }, data.checklist || []));
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id]);

  const toggle = (index) => {
    setChecklist((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], checked: next[index].checked ? 0 : 1 };
      return next;
    });
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
      };
      return next;
    });
  };

  const removeAttachmentFile = (index, fileIndex) => {
    setChecklist((prev) => {
      const next = [...prev];
      const current = next[index].attachmentFiles || [];
      next[index] = {
        ...next[index],
        attachmentFiles: current.filter((_, i) => i !== fileIndex),
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
          checked: !!c.checked,
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
    childrenApi
      .updateChecklist(id, items)
      .then(() => {
        toast.success('Checklist saved.');
      })
      .catch((err) => toast.error(err?.message || 'Failed to save checklist.'))
      .finally(() => setSaving(false));
  };

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
          <Link to={`/children/${id}`} className="text-sm text-slate-500 hover:text-slate-700">← Back to applicant</Link>
          <Link to={`/children/${id}/certificate-of-live-birth`} className="text-sm text-sky-600 hover:text-sky-700 font-medium">Certificate of Live Birth</Link>
        </div>
        <h1 className="text-2xl font-semibold text-slate-800 mt-2">
          Document checklist: {child.first_name} {child.last_name}
        </h1>
        <p className="text-slate-600 mt-1">
          Age group: {child.age_group?.replace(/_/g, ' ')} · {Math.round(progress * 100)}% complete
        </p>
      </div>

      <div className="mb-4 h-2 w-full rounded-full bg-slate-200 overflow-hidden" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-sky-600 transition-all" style={{ width: `${progress * 100}%` }} />
      </div>

      {steps.length > 1 && (
        <nav className="flex gap-2 mb-6" aria-label="Checklist steps">
          {steps.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                step === i ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
          {(currentStep?.items || []).map((item, idx) => {
            const globalIndex = checklist.findIndex((c) => c.label === item.label && c.category === item.category);
            return (
              <li key={`${item.category}-${item.id}`} className="px-5 py-4">
                <div className="flex gap-3">
                  <input
                    type="checkbox"
                    id={`check-${globalIndex}`}
                    checked={!!item.checked}
                    onChange={() => toggle(globalIndex)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
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
                      {(item.attachmentFiles || []).map((file, fi) => (
                        <span key={fi} className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-sm">
                          {file.name}
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
                        <a
                          key={fi}
                          href={apiUrl(`/children/${id}/attachments/${encodeURIComponent(filename)}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-sky-600 hover:underline"
                        >
                          View {filename}
                        </a>
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
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save checklist'}
        </button>
        <Link to={`/children/${id}`} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Back to applicant
        </Link>
      </div>
    </div>
  );
}
