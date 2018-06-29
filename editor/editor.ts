import * as $ from 'jquery'
import * as fs from 'fs'
import * as path from 'path'
import * as ui from '../lib/ui'
import * as commandLineArgs from 'command-line-args'
import {remote} from 'electron'

const log = remote.getGlobal('console').log

// trivial type definitions for viewer.js and csg.js loaded in index.html
declare class CSG {}
declare class Viewer {
    constructor(csg: CSG, width: number, height: number, depth: number, angle: number)
}

const uiElt = () => <HTMLTableElement>$('#ui')[0]
const viewerElt = () => <HTMLDivElement>$('#viewer')[0]
const errorElt = () => <HTMLElement>$('#error')[0]

let modelCode = ""
let model: any
let viewer: any

let modelFn = '../models/demo/model.js'
let libFn = '../lib/lib.js'
let uiFn = '../lib/ui.js'

// read the file
const read = () => {
    try {
        log('reading', modelFn)
        const newValue = fs.readFileSync(modelFn).toString()
        if (newValue != modelCode) {
            modelCode = newValue
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
    log('viewOptions', ui.viewOptions)
    const angle = Math.atan(ui.viewOptions.height / 2 / ui.viewOptions.distance) / Math.PI * 360
    log('angle', angle)
    viewer = new Viewer(new CSG(), size.width, size.height, ui.viewOptions.distance, angle)
    $(viewerElt()).append(viewer.gl.canvas)
}

function construct() {
    log('constructing')
    try {
        let lib = require(libFn)
        let ui = require(uiFn)
        model = new Function('log', 'lib', 'ui', modelCode)(log, lib, ui)
        errorElt().innerHTML = ''
    } catch (e) {
        log(e.toString())
        errorElt().innerText = e.toString()
    }
}

function render() {
    log('rendering')
    viewer.mesh = model.toMesh()
    viewer.gl.ondraw()
}

export function change() {
    construct()
    size()
    render()
}

$(window).on('error', (error) => {
    const e = <any>error.originalEvent
    log('error', e.message, e.filename, e.lineno)
})

$(window).on('resize', () => {
    size()
    render()
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

    // read model dir
    fs.readdirSync('../models').forEach(fn => {
        $('<option>')
            .attr('value', fn)
            .text(fn)
            .appendTo('#model-selector')
    })

    // render
    read()
    construct()
    size()
    render();

    // respond to file changes
    [modelFn, libFn, uiFn].forEach((watchFn) => {
        fs.watch(path.dirname(watchFn), (what, fn) => {
            log('file change', what, fn, path.basename(watchFn))
            if (fn == path.basename(watchFn)) {
                try {
                    delete require.cache[require.resolve(fn)]
                } catch(e) {
                    //
                }
                read()
                construct()
                size()
                render()
            }
        })
    })

})
