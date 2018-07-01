import * as $ from 'jquery'
import * as fs from 'fs'
import * as path from 'path'
import * as ui from '../lib/ui'
import * as commandLineArgs from 'command-line-args'

import {remote} from 'electron'
const log = remote.getGlobal('console').log

const CSG = require('@jscad/CSG').CSG
const Viewer = require('@jscad/openjscad/src/ui/viewer/jscad-viewer')

function now() {
    return new Date().getTime()
}

function message(msg: string) {
    $('#message')[0].innerText = msg
}

const libNames = ['lib', 'ui']

function libFn(name: string) {
    return path.join('../lib', name + '.js')
}

class Model {

    static current: Model | null = null
    static models: {[name: string]: Model} = {}
    static viewer: any

    name: string = 'N/A'
    fn: string = 'N/A'
    fileChanged: boolean = true
    code: string = "N/A"
    stats: string = "N/A"
    settings: ui.Settings = {}
    viewOptions: ui.ViewOptions | null = null

    components: {[name: string]: any} | null = null
    currentComponent: any
    currentComponentName: string = 'N/A'

    constructor(name: string) {
    
        log('adding model', name)
        this.name = name
        this.fn = path.join('../models', name, 'model.js')

        Model.models[name] = this

        // watch for changes
        fs.watch(path.dirname(this.fn), (what, fn) => {
            if (fn == path.basename(this.fn)) {
                log('file change', what, fn)
                if (this == Model.current)
                    this.read()
                else
                    this.fileChanged = true
            }
        })
    }

    // make this model the active one
    activate() {

        log('activating', this.name)
        Model.current = this

        // read if needed, else just show
        if (!this.components || this.fileChanged) {
            this.read()
        } else {
            ui.load(this.settings)
            this.show()
            message(this.stats)
        }
    }

    // read the file
    read() {
        try {
            log('reading', this.fn)
            this.fileChanged = false
            const newValue = fs.readFileSync(this.fn).toString()
            if (newValue != this.code) {
                this.code = newValue
                $('#component-selector').empty()
                this.settings = {}
                this.construct()
            }
        } catch (e) {
            log(e)
        }
    }

    // execute file, constructing model using csg
    construct() {

        log('constructing')
        message('constructing...')

        const start = now()

        // defer so we will see the "constructing..." message
        setTimeout(() => {

            try {

                // execute the code
                const loadedLibs = libNames.map((name) => require(libFn(name)))
                ui.load(this.settings)
                this.components = new Function('log', 'CSG', ...libNames, this.code)(log, CSG, ...loadedLibs);
                this.settings = ui.settings
                this.viewOptions = ui.viewOptions

                // message number of polys in each compoment, and construction time
                this.stats = Object.keys(this.components!).map(
                    (name) => name + ': ' + this.components![name].polygons.length
                ).join(', ')
                message(this.stats + ';    ' + (now() - start) + 'ms')

                // show our components, ui, and model
                this.show()

            } catch (e) {
                log(e.stack)
                message(e.toString())
            }

        }, 0) // setTimeout
    }

    // show our components and ui
    show() {

        log('showing', this.name)

        // show ui
        ui.show()

        // populate #component-selector, choose initialComponent
        let initialComponent: string | null = null
        $('#component-selector').empty()
        for (const component in this.components!) {
            if (!initialComponent || component == this.currentComponentName)
                initialComponent = component
            $('<option>')
                .attr('value', component)
                .text(component)
                .appendTo('#component-selector')
        }

        // set up Viewer viewport
        const angle = Math.atan(this.viewOptions!.height / 2 / this.viewOptions!.distance) / Math.PI * 360
        Model.viewer.setCameraOptions({
            fov: angle,
            angle: {x: -60, y: 0, z: 0},
            position: {x: 0, y: 0, z: this.viewOptions!.distance}
        })
        Model.viewer.resetCamera()
        Model.viewer.handleResize()

        // select initial component, trigger change, which causes it to be rendered via setComponent
        if (initialComponent)
            $('#component-selector').val(initialComponent).trigger('change');
    }

    setComponent(componentName: string) {
        log('setComponent', this.name, componentName)
        this.currentComponent = this.components![componentName]
        this.currentComponentName = componentName
        Model.viewer.setCsg(this.currentComponent.rotateX(90))
    }
}

// ui calls this to indicate change in parameters
export function change() {
    if (Model.current)
        Model.current.construct()
}

$(window).on('load', () => {

    // select model
    log('argv', remote.process.argv)
    const optionDefinitions = [
        {name: 'model', alias: 'm', type: String, defaultValue: 'demo'}
    ]
    const options = commandLineArgs(optionDefinitions, {argv: remote.process.argv.slice(2)})
    log(options)

    // read model directory, populate menu
    log('reading ../models')
    fs.readdirSync('../models').forEach(fn => {
        $('<option>')
            .attr('value', fn)
            .text(fn)
            .appendTo('#model-selector')
        new Model(fn)
    })

    // add viewer
    // work around bug: Viewer constructor doesn't apply background from options
    const viewerDefaults = Viewer.defaults()
    viewerDefaults.background.color = {r: 1.0, g: 1.0, b: 1.0, a: 0.0}
    Viewer.defaults = () => viewerDefaults
    Model.viewer = new Viewer($('#viewer')[0], {
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

    // respond to model selector changes
    $('#model-selector').on('change', () => {
        const name = (<HTMLSelectElement>$('#model-selector')[0]).value
        Model.models[name].activate()
    })

    // respond to component selector changes
    $('#component-selector').on('change', () => {
        const componentName = (<HTMLSelectElement>$('#component-selector')[0]).value
        if (Model.current)
            Model.current.setComponent(componentName)
    })

    // load initial model by triggering change which calls activate() on the model
    log('loading initial model')
    $('#model-selector').val(options.model).trigger('change');

})

$(window).on('error', (error) => {
    const e = <any>error.originalEvent
    log('error', e.message, e.filename, e.lineno)
})

