const { ipcRenderer } = require('electron');

window.electron = {
  selectFolder: () => ipcRenderer.invoke('select-folder')
};
