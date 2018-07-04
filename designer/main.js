"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
// avoid being garbage collected
var win;
electron_1.app.on('ready', function () {
    win = new electron_1.BrowserWindow({
        width: 1024,
        height: 640,
    });
    win.loadFile('designer.html');
    win.on('closed', function () {
        win = null;
    });
});
// Quit when all windows are closed.
electron_1.app.on('window-all-closed', function () {
    if (true /*process.platform !== 'darwin'*/) {
        electron_1.app.quit();
    }
});
/*
app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (wina === null) {
        createWindow()
    }
})
*/
//
//const {app, BrowserWindow} = require('electron')
//
//let mainWindow
//
//function createWindow () {
//
//    mainWindow = new BrowserWindow({width: 800, height: 600})
//    mainWindow.loadFile('index.html')
//    
//    mainWindow.on('closed', function () {
//        mainWindow = null
//    })
//}
//
//app.on('ready', createWindow)
//
//app.on('window-all-closed', function () {
//    if (process.platform !== 'darwin') {
//        app.quit()
//    }
//})
//
//app.on('activate', function () {
//    if (mainWindow === null) {
//        createWindow()
//    }
//})
//
