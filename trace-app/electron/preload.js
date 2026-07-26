const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  saveFieldPositionPdf: (pdfBase64, suggestedFileName) =>
    ipcRenderer.invoke('save-field-position-pdf', pdfBase64, suggestedFileName),
  openPdfInBrowser: (filePath, browserChoice) =>
    ipcRenderer.invoke('open-pdf-in-edge', filePath, browserChoice),
  openPdfInEdge: (filePath, browserChoice) =>
    ipcRenderer.invoke('open-pdf-in-edge', filePath, browserChoice),
  isElectron: true,
});
