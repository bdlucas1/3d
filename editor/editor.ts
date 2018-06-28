import * as $ from 'jquery'
import * as fs from 'fs'
import * as path from 'path'
import * as commandLineArgs from 'command-line-args'
import {remote} from 'electron'

const log = remote.getGlobal('console').log

// trivial type definitions for viewer.js and csg.js loaded in index.html
declare class CSG {}
declare class Viewer {
    constructor(csg: CSG, width: number, height: number, xxx: number)
}

const editorElt = () => <HTMLTextAreaElement>$('#editor')[0]
const viewerElt = () => <HTMLDivElement>$('#viewer')[0]
const errorElt = () => <HTMLElement>$('#error')[0]
let viewer: any
let keyTimeout: any = null
let modelFn = '../models/demo/model.js'
let libFn = '../lib/lib.js'

// read the file
const read = () => {
    try {
        log('reading', modelFn)
        const newValue = fs.readFileSync(modelFn).toString()
        if (newValue != editorElt().value) {
            editorElt().value = newValue
            return true
        }
    } catch (e) {
        log(e)
    }
    return false
}

// compute size, create viewer
function size() {
    $(viewerElt()).empty()
    const size = viewerElt().getBoundingClientRect()
    log('size', size.width, size.height)
    viewer = new Viewer(new CSG(), size.width, size.height, 5)
    $(viewerElt()).append(viewer.gl.canvas)
}

// compile program
function build(save: boolean) {
    log('building')
    try {
        delete require.cache[require.resolve(libFn)]
        let lib = require(libFn)
        const model = new Function('lib', 'log', editorElt().value)(lib, log)
        errorElt().innerHTML = ''
        viewer.mesh = model.toMesh()
        viewer.gl.ondraw()
        if (save) {
            log('saving')
            fs.writeFileSync(modelFn, editorElt().value)
        }
    } catch (e) {
        errorElt().innerText = 'Error: ' + e.toString()
    }
}

$(window).on('error', (error) => {
    const e = <any>error.originalEvent
    log('error', e.message, e.filename, e.lineno)
})

$(window).on('resize', () => {
    size()
    build(false)
})

$(window).on('load', () => {

    // select model
    log('argv', remote.process.argv)
    const optionDefinitions = [
        {name: 'model', alias: 'm', type: String, defaultValue: 'demo'}
    ]
    const options = commandLineArgs(optionDefinitions, {argv: remote.process.argv.slice(2)})
    modelFn = path.join('../models', options.model, 'model.js')
    log(options)

    // render
    size()
    read()
    build(false)

    // respond to edits
    $(editorElt()).on('input', () => {
        log('key change')
        if (keyTimeout)
            clearTimeout(keyTimeout)
        keyTimeout = setTimeout(() => build(true), 250)
    });

    // respond to file changes
    [modelFn, libFn].forEach((watchFn) => {
        fs.watch(path.dirname(watchFn), (what, fn) => {
            log('file change', what, fn, path.basename(watchFn))
            if (fn == path.basename(watchFn))
                if (fn != path.basename(modelFn) || read())
                    build(false)
        })
    })

})
