import * as $ from 'jquery'
import * as fs from 'fs'
import * as path from 'path'
import * as ui from '../lib/ui'
import * as commandLineArgs from 'command-line-args'

import {remote} from 'electron'
const log = remote.getGlobal('console').log

const CSG = require('@jscad/CSG').CSG
const Viewer = require('@jscad/openjscad/src/ui/viewer/jscad-viewer')
// work around bug: Viewer constructor doesn't apply background from options
const viewerDefaults = Viewer.defaults()
viewerDefaults.background.color = {r: 1.0, g: 1.0, b: 1.0, a: 0.0}
Viewer.defaults = () => viewerDefaults

function now() {
    return new Date().getTime()
}

const uiElt = () => <HTMLTableElement>$('#ui')[0]
const viewerElt = () => <HTMLDivElement>$('#viewer')[0]

function message(msg: string) {
    $('#message')[0].innerText = msg
}

const libNames = ['lib', 'ui']

function libFn(name: string) {
    return path.join('../lib', name + '.js')
}

let modelName = 'N/A'
let componentName = 'N/A'
let modelCode = "N/A"
let models: {[name: string]: any} = {}
let model: any
let modelViewer: any

function modelFn(name: string) {
    return path.join('../models', name, 'model.js')
}

// read the file
function read() {

    try {

        // read the file
        const fn = modelFn(modelName)
        log('reading', fn)
        const newValue = fs.readFileSync(fn).toString()
        if (newValue != modelCode) {
            modelCode = newValue
            $('#component-selector').empty()
            construct()
        }

    } catch (e) {
        log(e)
    }
}

// execute file, constructing model using csg
function construct() {

    log('constructing')
    message('constructing...')

    const currentComponent = (<HTMLSelectElement>$('#component-selector')[0]).value
    const start = now()

    // defer so we will see the "constructing..." message
    setTimeout(() => {

        try {

            // execute the code
            const loadedLibs = libNames.map((name) => require(libFn(name)))
            models = new Function('log', 'CSG', ...libNames, modelCode)(log, CSG, ...loadedLibs)

            // populate #component-selector, choose initialComponent
            let initialComponent: string | null = null
            $('#component-selector').empty()
            for (const component in models) {
                if (!initialComponent || component == currentComponent)
                    initialComponent = component
                $('<option>')
                    .attr('value', component)
                    .text(component)
                    .appendTo('#component-selector')
            }

            // message number of polys in each compoment, and construction time
            const polys = Object.keys(models).map(
                (name) => name + ': ' + models[name].polygons.length
            ).join(', ')
            message(polys + ';    ' + (now() - start) + 'ms')

            // compute viewing parameters
            const size = viewerElt().getBoundingClientRect()
            const angle = Math.atan(ui.viewOptions.height / 2 / ui.viewOptions.distance) / Math.PI * 360
            log('size', size.width, size.height, 'angle', angle)

            // construct viewer, add to page
            $(viewerElt()).empty()
            modelViewer = new Viewer(viewerElt(), {
                camera: {
                    fov: angle,
                    angle: {x: -60, y: 0, z: 0},
                    position: {x: 0, y: 0, z: ui.viewOptions.distance}
                },
                plate: {
                    draw: false,
                },
                solid: {
                    lines: true,
                    overlay: false,
                    smooth: false, // smooth lighting
                    faceColor: {r: 1.0, g: 1.0, b: 1.0, a: 1.0}
                },
                /*  bug: Viewer doesn't apply background options here; worked around it above
                background: {
                    color: {r: 1.0, g: 1.0, b: 1.0, a: 0.0}
                }
                */
            })

            // select initial component, trigger change, which causes it to be rendered
            if (initialComponent)
                $('#component-selector').val(initialComponent).trigger('change');

        } catch (e) {
            log(e.stack)
            message(e.toString())
        }

    }, 0) // setTimeout
}

function render() {
    log('rendering')
    modelViewer.setCsg(model.rotateX(90))
}

// ui calls this to indicate change in parameters
export function change() {
    construct()
}

$(window).on('resize', () => {
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

    // respond to model selector changes
    $('#model-selector').on('change', () => {
        modelName = (<HTMLSelectElement>$('#model-selector')[0]).value
        modelCode = ''
        ui.clear()
        read()
    })

    // respond to component selector changes
    $('#component-selector').on('change', () => {
        componentName = (<HTMLSelectElement>$('#component-selector')[0]).value
        model = models[componentName]
        render();
    })

    // load initial model
    $('#model-selector').val(options.model).trigger('change');

})

$(window).on('error', (error) => {
    const e = <any>error.originalEvent
    log('error', e.message, e.filename, e.lineno)
})

