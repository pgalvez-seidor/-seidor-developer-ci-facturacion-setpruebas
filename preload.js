const { ipcRenderer } = require('electron');

window.electron = {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  quit: () => ipcRenderer.send('quit-app')
};
