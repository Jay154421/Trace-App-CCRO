import toast from 'react-hot-toast';

const PDF_BROWSER_LABELS = {
  edge: 'Microsoft Edge',
  chrome: 'Google Chrome',
  default: 'your default app',
};

export function pdfBrowserLabel(browser) {
  return PDF_BROWSER_LABELS[browser] || 'your browser';
}

export async function openSavedPdfInBrowser(filePath, browserChoice) {
  const openFn = window.electron?.openPdfInBrowser ?? window.electron?.openPdfInEdge;
  if (!openFn) {
    return { ok: false, error: 'Open in browser is available in the desktop app.' };
  }
  try {
    return await openFn(filePath, browserChoice);
  } catch (err) {
    return { ok: false, error: err?.message || 'Could not open the PDF in a browser.' };
  }
}

async function openSavedPdfInChosenBrowser(filePath, browserChoice) {
  return openSavedPdfInBrowser(filePath, browserChoice);
}

/** After Save as PDF: let the user pick Edge or Chrome (no auto-open). */
export function showPdfSavedBrowserChoiceToast(filePath, label = 'PDF') {
  const handleOpen = async (t, browserChoice) => {
    toast.dismiss(t.id);
    const result = await openSavedPdfInChosenBrowser(filePath, browserChoice);
    if (!result?.ok) {
      toast.error(result?.error || 'Could not open the PDF in a browser.');
      return;
    }
    toast.success(`${label} opened in ${pdfBrowserLabel(result.browser)}.`, { duration: 5000 });
  };

  toast.custom(
    (t) => (
      <div
        className={`relative max-w-md rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 pr-10 text-sm text-emerald-900 shadow-lg transition-opacity duration-300 ease-out ${t.visible ? 'opacity-100' : 'opacity-0'}`}
        role="status"
      >
        <button
          type="button"
          onClick={() => toast.dismiss(t.id)}
          className="absolute right-2 top-2 flex items-center justify-center rounded-md p-1 text-emerald-700 opacity-60 hover:bg-emerald-100 hover:opacity-100 focus:outline-none transition-opacity duration-200"
          aria-label="Close"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <p className="font-medium">{label} saved.</p>
        <p className="mt-1 text-emerald-800">Choose a browser to open the PDF:</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleOpen(t, 'edge')}
            className="rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-900 hover:bg-emerald-100"
          >
            Microsoft Edge
          </button>
          <button
            type="button"
            onClick={() => handleOpen(t, 'chrome')}
            className="rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-900 hover:bg-emerald-100"
          >
            Google Chrome
          </button>
        </div>
      </div>
    ),
    { duration: 30000 }
  );
}

/** After save: notify only — open Edge/Chrome only when the user picks a browser. */
export function onPdfSavedOpenInBrowser(filePath, label) {
  showPdfSavedBrowserChoiceToast(filePath, label);
}
