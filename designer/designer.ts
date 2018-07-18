import * as $ from 'jquery'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as ui from './ui'
const lib = require('./lib.js')

import * as commandLineArgs from 'command-line-args'

import {remote} from 'electron'
const log = remote.getGlobal('console').log

const CSG = require('@jscad/CSG').CSG
const Viewer = require('@jscad/openjscad/src/ui/viewer/jscad-viewer')
const io = require('@jscad/io')

// convenience for models
export {ui, lib, CSG, log}

function now() {
    return new Date().getTime()
}

export function message(msg: string) {
    $('#message')[0].innerText = msg
}

type CSG = any // xxx
type Components = {[name: string]: CSG}

type Variant = {
    name: string,
    values: ui.Values,
    locked: boolean,
    changed: boolean,
    deleted: boolean,
    components: Components | null,
    currentComponent: string | null,
    stats: string
}

function emptyVariant(name: string, locked: boolean) {
    return {name, values: {}, locked, changed: false, deleted: false, components: null, currentComponent: null, stats: 'N/A'}
}

class Model {

    static dn = '../models'
    static current: Model | null = null
    static models: {[name: string]: Model} = {}
    static viewer: any
    static csg: CSG

    static live = true
    static hasChanged = false
    static eye: Eye
    static lock: Lock

    name: string = 'N/A'
    controls = new ui.Controls()

    currentVariant: Variant = emptyVariant('default', true)
    variants: {[name: string]: Variant} = {'default': this.currentVariant}

    modelFn: string = 'N/A'
    fileChanged: boolean = true
    code: string = "N/A"

    constructor(name: string) {
    
        log('adding model', name)
        this.name = name
        this.modelFn = path.join(Model.dn, name, 'model.js')

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

    }

    // make this model the active one
    activate() {

        log('activating', this.name)
        Model.current = this

        // read if needed, else just show
        if (this.fileChanged) {
            this.read()
        } else {
            this.controls.activate()
            this.show()
            message(this.currentVariant.stats)
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
                this.controls.clear()
                this.currentVariant = this.variants['default']
                Model.lock.setState({locked: true, changed: false})
                this.construct()
            }

            // read variants dirs
            const modelDn = path.join(Model.dn, this.name)
            fs.readdirSync(modelDn).forEach(name => {
                const variantFn = path.join(modelDn, name, 'variant.json')
                if (fs.existsSync(variantFn)) {
                    const variant = JSON.parse(fs.readFileSync(variantFn).toString())
                    this.variants[name] = emptyVariant(name, true)
                    this.variants[name].values = variant
                }
            })

        } catch (e) {
            log(e)
        }
    }

    // execute file, constructing model using csg
    construct() {

        log('scheduling construction')
        message('constructing...');
        Model.eye.working()

        const start = now()
        const startCPU = os.cpus().reduce((a, b) => <number>a + b.times.user, 0)

        // defer so we will see the "constructing..." message
        setTimeout(() => {

            try {

                // execute the code
                log('starting construction')
                const libNames = ['ui', 'lib']
                const loadedLibs = libNames.map((name) => require('./' + name + '.js'))
                this.controls.activate() // assert already active?
                const module = path.join('..', 'models', this.name, 'model.js')
                delete require.cache[require.resolve(module)]
                this.currentVariant.components = require(module).components
                const endCPU = os.cpus().reduce((a, b) => a + b.times.user, 0)

                // reset hasChanged flag
                Model.hasChanged = false
                $('#changed').css('background', 'none')

                // remember default controls
                this.variants['default'].values = this.controls.defaultValues

                // message number of polys in each compoment, and construction time
                this.currentVariant.stats = Object.keys(this.currentVariant.components!).map((name) => {
                    const polys = this.currentVariant.components![name].polygons
                    return name + ': ' + (polys? polys.length : 'none')
                }).join(', ')
                message(this.currentVariant.stats + ';    ' + (now() - start) + 'ms (' + (endCPU - startCPU) + 'ms)')
                Model.eye.resting()

                // show our components, variants, ui, and model
                this.show()

                // now's a good time to schedule a gc
                //setTimeout(() => (<any>global.gc)(true), 0)

            } catch (e) {
                log(e.stack)
                message(e.toString())
            }

        }, 100) // setTimeout
    }

    populateVariantSelector() {
        let initialVariant: string | null = null
        $('#variant-selector').empty()
        for (const name in this.variants!) {
            if (!initialVariant || name == this.currentVariant.name)
                initialVariant = name
            $('<option>')
                .attr('value', name)
                .text(name)
                .addClass(this.variants![name].deleted? 'deleted' : '')
                .appendTo('#variant-selector')
        }
        if (initialVariant) {
            $('#variant-selector').val(initialVariant)
            Model.lock.setState(this.variants[initialVariant])
        }
    }

    // save variant dir
    saveVariant(variant: Variant) {
        const variantDir = path.join(Model.dn, this.name, variant.name)
        if (!variant.deleted) {
            if (!fs.existsSync(variantDir))
                fs.mkdirSync(variantDir)
            const variantFn = path.join(variantDir, 'variant.json')
            const variantString = JSON.stringify(variant.values, null, 4)
            fs.writeFileSync(variantFn, variantString)
        } else {
            const rmdirRecursive = (dn: string) => {
                fs.readdirSync(dn).forEach(fn => {
                    fn = path.join(dn, fn)
                    if (fs.statSync(fn).isDirectory())
                        rmdirRecursive(fn)
                    else
                        fs.unlinkSync(fn)
                })
                fs.rmdirSync(dn)
            }
            rmdirRecursive(variantDir)
        }
    }


    // show our components and ui
    show() {

        log('showing', this.name)

        // show ui
        this.controls.activate()

        // populate #variant-selctor, choosing initial variant
        this.populateVariantSelector()

        // populate #component-selector, choose initialComponent
        let initialComponent: string | null = null
        $('#component-selector').empty()
        for (const component in this.currentVariant.components!) {
            if (!initialComponent || component == this.currentVariant.currentComponent)
                initialComponent = component
            $('<option>')
                .attr('value', component)
                .text(component)
                .appendTo('#component-selector')
        }

        // set up Viewer viewport
        let viewOptions = this.controls.viewOptions
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
        const variant = this.variants[name]
        this.currentVariant = variant
        if (variant.deleted) {
            variant.deleted = false
            this.saveVariant(this.currentVariant)
            this.populateVariantSelector()
        }
        this.controls.loadValues(variant.values)
        Model.lock.setState(variant)
        if (!this.currentVariant.components) {
            this.construct()
        } else {
            this.show()
            message(this.currentVariant.stats)
        }
    }

    setComponent(name: string) {
        log('setComponent', this.name, name)
        this.currentVariant.currentComponent = name
        Model.csg = this.currentVariant.components![name]
        Model.viewer.setCsg(Model.csg.translate(this.controls.viewOptions.center.times(-1)))
    }
}

// ui calls this to indicate change in parameters
export function change(immaterial: boolean = false) {

    if (Model.current) {

        const model = Model.current

        // if we're locked create a new variant
        if (model.currentVariant.locked && !immaterial) {
            let max = 0
            for (let name in model.variants) {
                const f = name.split(' ')
                if (f[0] == 'variant') {
                    const v = parseInt(f[1])
                    if (v > max)
                        max = v
                }
            }
            const num = '000' + (max + 1)
            const newName = 'variant ' + num.substring(num.length - 3, num.length)
            model.currentVariant = emptyVariant(newName, false)
            model.variants[newName] = model.currentVariant
        }

        // we're changed
        model.currentVariant.changed = true

        // record ui state in variant
        const controls = ui.Controls.current!.controls
        for (const name in controls)
            model.currentVariant.values[name] = controls[name].value

        // update lock state
        Model.lock.setState(model.currentVariant)

        // show or note change
        if (Model.live) {
            // this "working" cue is too similar to non-live "changed" cue
            //$('#changed').css('background', 'rgba(255,255,255,0.3)');
            model.construct()
        } else {
            $('#changed').css('background', 'rgba(255,255,255,0.7)');
            Model.hasChanged = true;
        }

        // save variants to file
        model.saveVariant(model.currentVariant)
    }
}

class Control {

    static strokeStyle = 'rgb(150,150,150)'
    static lineWidth = 8

    canvas: HTMLCanvasElement
    ctx: CanvasRenderingContext2D

    constructor(section: string, title: string | null, width: number = 100) {
        this.canvas = <HTMLCanvasElement>$('<canvas>').attr('width', width).attr('height', 100).appendTo(section)[0]
        if (title)
            $(this.canvas).attr('title', title)
        this.ctx = this.canvas.getContext('2d')!
        this.ctx.strokeStyle = Control.strokeStyle
        this.ctx.lineWidth = Control.lineWidth
        this.ctx.lineCap = 'round'
        this.ctx.lineJoin = 'round'
        this.ctx.beginPath()
    }
}

class ExportModels extends Control {
    constructor() {
        super('#model-controls', 'Export models')
        const circle = 2 * Math.PI
        this.ctx.moveTo(50, 100)
        this.ctx.lineTo(50, 0)
        this.ctx.moveTo(25, 40)
        this.ctx.lineTo(50, 0)
        this.ctx.lineTo(75, 40)
        this.ctx.stroke()
        $(this.canvas).on('click', () => {
            const m = Model.current!
            for (const name in m.currentVariant.components!) {
                const fn = path.join(Model.dn, m.name, m.currentVariant.name, name) + '.stl'
                log('writing', fn)
                const csg = m.currentVariant.components![name].scale(100)
                const stl = io.stlSerializer.serialize(csg, {binary: false})
                fs.writeFileSync(fn, stl[0].toString())
            }
        })
    }
}

class UndoRedoVariant extends Control {
    constructor(undo: boolean) {
        super('#variant-controls', (undo? 'Undo' : 'Redo') + ' variant changes')
        const circle = 2 * Math.PI
        if (!undo) {
            this.ctx.translate(100, 0)
            this.ctx.scale(-1, 1)
        }
        this.ctx.arc(50, 51, 42, -0.25 * circle, 0.6 * circle)
        this.ctx.moveTo(50, 40)
        this.ctx.lineTo(50, 5)
        this.ctx.lineTo(90, 5)
        this.ctx.stroke()
    }
}

class DeleteVariant extends Control {

    constructor() {

        super('#variant-controls', 'Delete variant')
        const p = 10
        this.ctx.moveTo(p, p)
        this.ctx.lineTo(100 - p, 100 - p)
        this.ctx.moveTo(p, 100 - p)
        this.ctx.lineTo(100 - p, p)
        this.ctx.stroke()

        $(this.canvas).on('click', (e) => {
            const model = Model.current!
            model.currentVariant.deleted = true
            model.saveVariant(model.currentVariant) // deletes dirs
            model.populateVariantSelector()
            model.setVariant('default')
        })
    }
}

class SaveVariant extends Control {
    constructor() {
        super('#variant-controls', 'Save variant')
        this.ctx.moveTo(50, 0)
        this.ctx.lineTo(50, 100)
        this.ctx.moveTo(25, 60)
        this.ctx.lineTo(50, 100)
        this.ctx.lineTo(75, 60)
        this.ctx.stroke()
    }
}

class Lock extends Control {

    constructor() {
        super('#variant-controls', 'Lock/unlock variant')
        $(this.canvas).on('click', (e) => {
            const model = Model.current!
            // default is special - it can't be changed
            if (model.currentVariant.name != 'default') {
                model.currentVariant.locked = !model.currentVariant.locked
                if (model.currentVariant.locked)
                    model.currentVariant.changed = false
                Model.lock.setState(model.currentVariant)
            }
        })
    }

    setState(state: {locked: boolean, changed: boolean}) {
        this.draw(state.locked, state.changed)
    }

    private draw(locked: boolean, changed: boolean) {

        const y = 55
        const r = 30
        const p = Control.lineWidth / 2
        const w = 75

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        this.ctx.strokeStyle = changed? 'rgb(160,160,250)' : Control.strokeStyle
        this.ctx.beginPath()
        this.ctx.moveTo(50 - w/2, 100 - p)
        this.ctx.lineTo(50 + w/2, 100 - p)
        this.ctx.lineTo(50 + w/2, y)
        this.ctx.lineTo(50 - w/2, y)
        this.ctx.lineTo(50 - w/2, 100 - p)
        this.ctx.moveTo(50 - r, y)
        this.ctx.lineTo(50 - r, r + p)
        this.ctx.stroke()
        if (locked) {
            this.ctx.beginPath()
            this.ctx.moveTo(50 + r, y)
            this.ctx.lineTo(50 + r, r + p)
            this.ctx.stroke()
            this.ctx.beginPath()
            this.ctx.arc(50, r + p, r, Math.PI, 0)
        } else {
            this.ctx.beginPath()
            this.ctx.arc(50, r + p, r, Math.PI, - 0.2 * Math.PI)
        }
        this.ctx.stroke()
    }
}

class Eye extends Control {

    static width = 125
    static a = 0.20

    constructor() {
        super('#component-controls', 'Show model', Eye.width)
        $(this.canvas).attr('id', 'eye')
        this.resting()
        $(this.canvas).on('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            if (Model.hasChanged) {
                Model.current!.construct()
            } else {
                Model.live = !Model.live
                this.resting()
            }
        })
    }        

    working() {
        this.draw('working')
    }

    resting() {
        this.draw(Model.live? 'open' : 'closed')
    }

    draw(state: 'open' | 'closed' | 'working') {

        const width = Eye.width
        const circle = 2 * Math.PI
        const a = Eye.a * circle
        const x = Eye.width / 2 - 5
        const r = x / Math.sin(a)
        const y = r * Math.cos(a)

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.beginPath()
        this.ctx.arc(width/2, 50 + y, r, 0.75*circle - a, 0.75*circle + a)
        this.ctx.stroke()

        this.ctx.beginPath()
        this.ctx.arc(width/2, 50 - y, r, 0.25*circle - a, 0.25*circle + a)
        this.ctx.stroke()
    
        if (state=='closed') {
            this.ctx.beginPath()
            this.ctx.moveTo(width/2 - x, 50)
            this.ctx.lineTo(width/2 + x, 50)
            this.ctx.stroke()
        } else {
            this.ctx.beginPath()
            this.ctx.save()
            if (state=='working')
                this.ctx.strokeStyle = 'rgb(255,0,0)'
            this.ctx.arc(width/2, 50, width/5, 0, circle)
            this.ctx.stroke()
            this.ctx.restore()
        }

    }
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
    new ExportModels()
    //new SaveVariant()
    Model.lock = new Lock()
    new UndoRedoVariant(true)
    new UndoRedoVariant(false)
    new DeleteVariant()
    Model.eye = new Eye()

    // read model directory, populate menu
    log('reading models')
    let newestMtime = 0
    let newestModel: string
    fs.readdirSync(Model.dn).sort().forEach(fn => {
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

    // canvas to show if model has changed
    $('<canvas>').attr('id', 'changed').appendTo('#viewer')

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

