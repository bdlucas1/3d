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

    name: string = 'N/A'
    fn: string = 'N/A'
    code: string = "N/A"
    stats: string = "N/A"
    ui: ui.UI = {}

    components: {[name: string]: any} = {}
    currentComponent: any
    currentComponentName: string = 'N/A'

    viewerElt: HTMLElement | null = null
    viewer: any

    constructor(name: string) {
    
        log('adding model', name)
        this.name = name
        this.fn = path.join('../models', name, 'model.js')

        Model.models[name] = this

        // watch for changes
        fs.watch(path.dirname(this.fn), (what, fn) => {
            if (fn == path.basename(this.fn)) {
                log('file change', what, fn)
                if (this.viewerElt) {
                    $(this.viewerElt).remove()
                    this.viewerElt = null
                }
                this.ui = {}
                if (this == Model.current) {
                    ui.load(this.ui)
                    this.read()
                }
            }
        })
    }

    // make this model the active one
    activate() {

        log('activating', this.name)
        Model.current = this
        ui.load(this.ui)

        // read and construct viewer if needed
        if (!this.viewerElt) {
            this.read()
        } else {
            this.show()
            this.render() // xxx why doesn't showComponents trigger this?
            message(this.stats)
        }
    }

    // show our components and ui
    show() {

        log('showing', this.name)

        // show ui
        ui.show()

        // populate #component-selector, choose initialComponent
        let initialComponent: string | null = null
        $('#component-selector').empty()
        for (const component in this.components) {
            if (!initialComponent || component == this.currentComponentName)
                initialComponent = component
            $('<option>')
                .attr('value', component)
                .text(component)
                .appendTo('#component-selector')
        }
        
        // show our viewer
        $('#viewer div').css('z-index', '0')
        $(this.viewerElt!).css('z-index', '1')

        // select initial component, trigger change, which causes it to be rendered
        if (initialComponent)
            $('#component-selector').val(initialComponent).trigger('change');
    }

    // read the file
    read() {
        try {
            log('reading', this.fn)
            const newValue = fs.readFileSync(this.fn).toString()
            if (newValue != this.code) {
                this.code = newValue
                $('#component-selector').empty()
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
                this.components = new Function('log', 'CSG', ...libNames, this.code)(log, CSG, ...loadedLibs)
                this.ui = ui.get()

                // message number of polys in each compoment, and construction time
                this.stats = Object.keys(this.components).map(
                    (name) => name + ': ' + this.components[name].polygons.length
                ).join(', ')
                message(this.stats + ';    ' + (now() - start) + 'ms')

                // remove existing viewer if any
                // xxx we need to do this because constructing the
                // model may set the viewOptions, which we pass to the
                // Viewer on construction. But this resets the view
                // angle as well. Can we either re-use the Viewer and
                // update the options instead, or copy the view angle
                // over to the new Viewer?
                if (this.viewerElt)
                    $(this.viewerElt).remove()

                // construct viewer, add to page
                this.viewerElt = $('<div>').appendTo('#viewer')[0]
                const angle = Math.atan(ui.viewOptions.height / 2 / ui.viewOptions.distance) / Math.PI * 360
                this.viewer = new Viewer(this.viewerElt, {
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

                // show our components and ui
                this.show()

            } catch (e) {
                log(e.stack)
                message(e.toString())
            }

        }, 0) // setTimeout
    }

    render() {
        log('rendering', this.name)
        this.viewer.setCsg(this.currentComponent.rotateX(90))
    }

    setComponent(componentName: string) {
        this.currentComponent = this.components[componentName]
        this.currentComponentName = componentName
        this.render();
    }
}

// ui calls this to indicate change in parameters
export function change() {
    if (Model.current)
        Model.current.construct()
}

$(window).on('resize', () => {
    log('resize')
    if (Model.current)
        Model.current.render()
})

$(window).on('load', () => {

    // select model
    log('argv', remote.process.argv)
    const optionDefinitions = [
        {name: 'model', alias: 'm', type: String, defaultValue: 'demo'}
    ]
    const options = commandLineArgs(optionDefinitions, {argv: remote.process.argv.slice(2)})
    log(options)

    // respond to lib changes
    //libNames.forEach((name) => watch(libFn(name), null))

    // read model directory, populate menu
    log('reading ../models')
    fs.readdirSync('../models').forEach(fn => {
        $('<option>')
            .attr('value', fn)
            .text(fn)
            .appendTo('#model-selector')
        new Model(fn)
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

    // load initial model
    log('loading initial model')
    $('#model-selector').val(options.model).trigger('change');

})

$(window).on('error', (error) => {
    const e = <any>error.originalEvent
    log('error', e.message, e.filename, e.lineno)
})

