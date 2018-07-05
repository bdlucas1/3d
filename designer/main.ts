import {app, BrowserWindow} from 'electron'

// avoid being garbage collected
let win : BrowserWindow | null

app.on('ready', () => {

    win = new BrowserWindow({
        width: 1024,
        height: 640,
        //fullscreen: true,
        //simpleFullscreen: true,
        //show: false
    })

    win.loadFile('designer.html')

    win.on('closed', function () {
        win = null
    })

})

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    if (true /*process.platform !== 'darwin'*/) {
        app.quit()
    }
})

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
