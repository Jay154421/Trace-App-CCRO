const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  saveFieldPositionPdf: () => ipcRenderer.invoke('save-field-position-pdf'),
  isElectron: true,
});
