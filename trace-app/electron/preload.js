const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  saveFieldPositionPdf: (pdfBase64, suggestedFileName) =>
    ipcRenderer.invoke('save-field-position-pdf', pdfBase64, suggestedFileName),
  isElectron: true,
});
