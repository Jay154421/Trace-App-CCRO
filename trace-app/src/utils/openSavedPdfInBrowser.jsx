import toast from 'react-hot-toast';

const PDF_BROWSER_LABELS = {
  edge: 'Microsoft Edge',
  chrome: 'Google Chrome',
  default: 'your default app',
};

export function pdfBrowserLabel(browser) {
  return PDF_BROWSER_LABELS[browser] || 'your browser';
}

export async function openSavedPdfInBrowser(filePath) {
  const openFn = window.electron?.openPdfInBrowser ?? window.electron?.openPdfInEdge;
  if (!openFn) {
    return { ok: false, error: 'Open in browser is available in the desktop app.' };
  }
  try {
    return await openFn(filePath);
  } catch (err) {
    return { ok: false, error: err?.message || 'Could not open the PDF in a browser.' };
  }
}

function showPdfOpenBrowserRetryToast(filePath, label) {
  toast.custom(
    (t) => (
      <div
        role="button"
        tabIndex={0}
        className={`flex max-w-md cursor-pointer items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 shadow-lg transition-opacity duration-300 ease-out ${t.visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={async () => {
          toast.dismiss(t.id);
          const result = await openSavedPdfInBrowser(filePath);
          if (!result?.ok) {
            toast.error(result?.error || 'Could not open the PDF in a browser.');
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.currentTarget.click();
          }
        }}
      >
        {label} saved. Click here to open in Microsoft Edge or Google Chrome.
      </div>
    ),
    { duration: 12000 }
  );
}

export async function onPdfSavedOpenInBrowser(filePath, label) {
  const openResult = await openSavedPdfInBrowser(filePath);
  if (openResult?.ok) {
    const browserName = pdfBrowserLabel(openResult.browser);
    toast.success(`${label} saved and opened in ${browserName}.`, { duration: 5000 });
    return;
  }
  toast.error(openResult?.error || 'PDF saved but could not open in a browser.');
  showPdfOpenBrowserRetryToast(filePath, label);
}
