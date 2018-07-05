import * as $ from 'jquery'
import * as fs from 'fs'
import * as path from 'path'
import * as ui from './ui'

import * as commandLineArgs from 'command-line-args'

import {remote} from 'electron'
const log = remote.getGlobal('console').log

const CSG = require('@jscad/CSG').CSG
const Viewer = require('@jscad/openjscad/src/ui/viewer/jscad-viewer')
const io = require('@jscad/io')

function now() {
    return new Date().getTime()
}

function message(msg: string) {
    $('#message')[0].innerText = msg
}

class Model {

    static dn = '../models'
    static current: Model | null = null
    static models: {[name: string]: Model} = {}
    static viewer: any
    static csg: any

    name: string = 'N/A'
    stats: string = "N/A"
    settings = new ui.Settings()

    variantsFn: string = 'N/A'
    variants: {[name: string]: ui.Variant} = {}
    currentVariant: string = 'N/A'

    modelFn: string = 'N/A'
    fileChanged: boolean = true
    code: string = "N/A"
    components: {[name: string]: any} | null = null
    currentComponent: string = 'N/A'

    constructor(name: string) {
    
        log('adding model', name)
        this.name = name
        this.modelFn = path.join(Model.dn, name, 'model.js')
        this.variantsFn = path.join(Model.dn, name, 'variants.json')

        Model.models[name] = this

        // watch for changes
        fs.watch(path.dirname(this.modelFn), (what, fn) => {
            if (fn == path.basename(this.modelFn)) {
                log('file change', what, fn)
                if (this == Model.current)
                    this.read()
                else
                    this.fileChanged = true
            }
        })

        // xxx watch for changes on variantsFn?
    }

    // make this model the active one
    activate() {

        log('activating', this.name)
        Model.current = this

        // read if needed, else just show
        if (!this.components || this.fileChanged) {
            this.read()
        } else {
            this.settings.activate()
            this.show()
            message(this.stats)
        }
    }

    // read the file
    read() {

        try {

            // read model file
            log('reading', this.modelFn)
            this.fileChanged = false
            const newValue = fs.readFileSync(this.modelFn).toString()
            if (newValue != this.code) {
                this.code = newValue
                $('#component-selector').empty()
                this.settings.clear()
                this.currentVariant = 'default'
                this.construct()
            }

            // read variants file
            log('reading', this.variantsFn)
            this.variants = {}
            this.variants['default'] = {}
            const variants = JSON.parse(fs.readFileSync(this.variantsFn).toString())
            for (const name in variants)
                this.variants[name] = variants[name]

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
                const libNames = ['ui', 'lib']
                const loadedLibs = libNames.map((name) => require('./' + name + '.js'))
                this.settings.activate() // assert already active?
                this.components = new Function('log', 'CSG', ...libNames, this.code)(log, CSG, ...loadedLibs);

                // remember default settings
                this.variants['default'] = this.settings.defaultVariant

                // message number of polys in each compoment, and construction time
                this.stats = Object.keys(this.components!).map((name) => {
                    const polys = this.components![name].polygons
                    return name + ': ' + (polys? polys.length : 'none')
                }).join(', ')
                message(this.stats + ';    ' + (now() - start) + 'ms')

                // show our components, variants, ui, and model
                this.show()

                // now's a good time to schedule a gc
                setTimeout(() => (<any>global.gc)(true), 0)

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
        this.settings.activate()

        // populate #variant-selctor, choosing initial variant
        let initialVariant: string | null = null
        $('#variant-selector').empty()
        for (const variant in this.variants!) {
            if (!initialVariant || variant == this.currentVariant)
                initialVariant = variant
            $('<option>')
                .attr('value', variant)
                .text(variant)
                .appendTo('#variant-selector')
        }
        if (initialVariant)
            $('#variant-selector').val(initialVariant)

        // populate #component-selector, choose initialComponent
        let initialComponent: string | null = null
        $('#component-selector').empty()
        for (const component in this.components!) {
            if (!initialComponent || component == this.currentComponent)
                initialComponent = component
            $('<option>')
                .attr('value', component)
                .text(component)
                .appendTo('#component-selector')
        }

        // set up Viewer viewport
        let viewOptions = this.settings.viewOptions
        const angle = Math.atan(viewOptions.height / 2 / viewOptions.distance) / Math.PI * 360
        Model.viewer.setCameraOptions({
            fov: angle,
            angle: {x: -60, y: 0, z: 0},
            position: {x: 0, y: 0, z: viewOptions.distance}
        })
        Model.viewer.resetCamera()
        Model.viewer.handleResize()

        // select initial component, trigger change, which causes it to be rendered via setComponent
        if (initialComponent)
            $('#component-selector').val(initialComponent).trigger('change');
    }

    setVariant(name: string) {
        log('setVariant', this.name, name)
        this.currentVariant = name
        this.settings.loadVariant(this.variants[name])
        this.construct()
    }

    setComponent(name: string) {
        log('setComponent', this.name, name)
        this.currentComponent = name
        Model.csg = this.components![name]
        Model.viewer.setCsg(Model.csg.rotateX(90))
    }
}

// ui calls this to indicate change in parameters
export function change() {
    if (Model.current)
        Model.current.construct()
}

function controls() {

    function context() {
        const canvas = <HTMLCanvasElement>$('<canvas>').attr('width', 100).attr('height', 100).appendTo('#controls')[0]
        const ctx = canvas.getContext('2d')!
        ctx.strokeStyle = 'rgb(150,150,150)'
        ctx.lineWidth = 8
        return {canvas, ctx}
    }

    function save() {
        const {canvas, ctx} = context()
        ctx.moveTo(50, 0)
        ctx.lineTo(50, 100)
        ctx.moveTo(25, 60)
        ctx.lineTo(50, 100)
        ctx.lineTo(75, 60)
        ctx.stroke()
        $(canvas).on('click', () => {
            const stl = io.stlSerializer.serialize(Model.csg, {binary: false})
            const m = Model.current!
            const fn = path.join(Model.dn, m.name, [m.currentVariant, m.currentComponent].join(' - ') + '.stl')
            log('writing', fn)
            fs.writeFileSync(fn, stl[0].toString())
        })
    }

    function restore() {
        const {canvas, ctx} = context()        
        const circle = 2 * Math.PI
        ctx.arc(50, 51, 42, -0.25 * circle, 0.6 * circle)
        ctx.moveTo(50, 40)
        ctx.lineTo(50, 5)
        ctx.lineTo(90, 5)
        ctx.stroke()
    }


    save()
    restore()
}


$(window).on('load', () => {

    // select model
    log('argv', remote.process.argv)
    const optionDefinitions = [
        {name: 'model', alias: 'm', type: String},
        {name: 'dbg', type: Boolean}
    ]
    // ignore electron flags
    let argv = remote.process.argv.slice(1)
    while (argv[0].startsWith('-'))
        argv = argv.slice(1)
    const options = commandLineArgs(optionDefinitions, {argv: argv.slice(1)})
    log(options)

    // for non-simple fullscreen mode seem to have to wait until about here to enable it
    remote.getCurrentWindow().setFullScreen(true)

    // add controls
    controls()

    // read model directory, populate menu
    log('reading models')
    let newestMtime = 0
    let newestModel: string
    fs.readdirSync(Model.dn).forEach(fn => {
        $('<option>')
            .attr('value', fn)
            .text(fn)
            .appendTo('#model-selector')
        new Model(fn)
        const mtime = fs.statSync(path.join(Model.dn, fn)).mtimeMs
        if (mtime > newestMtime) {
            newestMtime = mtime
            newestModel = fn
        }
    })
    options.model = options.model || newestModel!

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
            lines: options.dbg,
            outlineColor: {r: 1.0, g: 0.0, b: 0.0, a: 1},
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

    // respond to variant selector changes
    $('#variant-selector').on('change', () => {
        const variantName = (<HTMLSelectElement>$('#variant-selector')[0]).value
        if (Model.current)
            Model.current.setVariant(variantName)
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

