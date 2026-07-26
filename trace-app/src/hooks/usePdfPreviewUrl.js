import { useState, useCallback } from 'react';
import { base64ToBlobUrl } from '../utils/pdfUtils';

/**
 * Blob URL + dialog state for in-app PDF preview (iframe).
 */
export function usePdfPreviewUrl() {
  const [url, setUrl] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const openPreview = useCallback((base64) => {
    const blobUrl = base64ToBlobUrl(base64);
    setUrl(blobUrl);
    setIsOpen(true);
  }, []);

  const closePreview = useCallback(() => {
    setIsOpen(false);
    setUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  return { url, isOpen, openPreview, closePreview };
}
