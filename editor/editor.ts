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

const libNames = ['lib', 'ui']

function libFn(name: string) {
    return path.join('../lib', name + '.js')
}

let modelName = 'N/A'
let modelCode = "N/A"
let model: any
let viewer: any

function modelFn(name: string) {
    return path.join('../models', name, 'model.js')
}

// read the file
function read() {
    try {
        const fn = modelFn(modelName)
        log('reading', fn)
        const newValue = fs.readFileSync(fn).toString()
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
        const loadedLibs = libNames.map((name) => require(libFn(name)))
        model = new Function('log', ...libNames, modelCode)(log, ...loadedLibs)
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
    log(options)

    function watch(watchFn: string, watchModel: string | null) {
        fs.watch(path.dirname(watchFn), (what, fn) => {
            log('file change', what, fn)
            if (fn == path.basename(watchFn) && (!watchModel || modelName == watchModel)) {
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
    }

    // respond to lib changes
    libNames.forEach((name) => watch(libFn(name), null))

    // read model directory, populate menu
    fs.readdirSync('../models').forEach(fn => {
        $('<option>')
            .attr('value', fn)
            .text(fn)
            .appendTo('#model-selector')
        watch(modelFn(fn), fn)
    })
    $('#model-selector').on('change', () => {
        modelName = (<HTMLSelectElement>$('#model-selector')[0]).value
        ui.clear()
        read()
        construct()
        size()
        render();
    })

    // load initial model
    $('#model-selector').val(options.model).trigger('change');

})
