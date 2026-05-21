import toast from 'react-hot-toast';

/**
 * @param {{ ok?: boolean, canceled?: boolean, error?: string } | undefined} result
 * @returns {boolean} true when the file was saved
 */
export function notifyElectronSavePdfResult(result) {
  if (result?.ok) return true;
  if (result?.canceled) return false;
  if (result?.error) {
    toast.error(result.error);
    return false;
  }
  toast.error(
    'Could not save PDF. If Windows showed "File not found", save to Downloads or Desktop instead of OneDrive Documents.',
  );
  return false;
}
