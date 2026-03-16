const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  saveFieldPositionPdf: (pdfBase64) => ipcRenderer.invoke('save-field-position-pdf', pdfBase64),
  isElectron: true,
});
