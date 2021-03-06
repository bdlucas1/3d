import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import * as $ from 'jquery'
import {remote} from 'electron'
import * as spline from 'commons-math-interpolation'
const catrom = require('cat-rom-spline')
const numeric = require('numeric')

import * as designer from '../designer/designer'
import * as lib from '../designer/lib'

const log = remote.getGlobal('console').log

const CSG = require('@jscad/CSG').CSG
const io = require('@jscad/io')

export type ViewOptions = {
    distance: number,
    height: number,
    center: any, // xxx csg vector
}

export type Values = {[name: string]: number | boolean | CurveValue | string}

interface Control<T> {
    value: T
    elt: HTMLElement
    activate(): void
}

export class Controls {

    static current: Controls | null = null

    static defaultViewOptions = {
        distance: 5,
        height: 2,
        center: lib.vec3(0, 0, 0)
    }
    
    viewOptions = Controls.defaultViewOptions

    defaultValues: Values = {}
    controls: {[name: string]: Control<any>} = {}

    activate() {

        Controls.current = this

        $('#ui-table').empty()
        for (const name in this.controls) {
            const control = this.controls[name]
            const tr = $('<tr>').appendTo('#ui-table')
            $('<td>').appendTo(tr).addClass('ui-name').append($('<span>').text(name))
            $('<td>').appendTo(tr).addClass('ui-control').append(control.elt)
            control.activate()
        }
    }

    clear() {
        this.controls = {}
        this.defaultValues = {}
    }

    loadValues(values: Values) {
        for (const name in values) {
            try {
                this.controls[name].value = values[name]
            } catch (e) {
                log('ERROR setting', name, e)
            }
        }
    }
}
    
export function view(_viewOptions: ViewOptions) {
    if (!Controls.current)
        return
    Controls.current.viewOptions = _viewOptions
}

type SliderOptions = {
    name: string,
    min: number,
    max: number,
    step?: number,
    value: number,
    immaterial?: boolean,
}

class Slider implements Control<number> {

    elt: HTMLElement
    inputElt: HTMLInputElement
    echoElt: HTMLElement
    options: SliderOptions

    constructor(options: SliderOptions) {

        this.elt = $('<span>').addClass('ui-slider')[0]
        this.inputElt = <HTMLInputElement>$('<input>').appendTo(this.elt)[0]
        this.echoElt = $('<span>').appendTo(this.elt).addClass('ui-value')[0]
        this.options = options

        $(this.inputElt)
            .attr('type', 'range')
            .attr('min', options.min)
            .attr('max', options.max)
            .attr('step', options.step || 1)
            .attr('value', options.value)

        $(this.echoElt).text(this.inputElt.value)
    }

    activate() {
        $(this.inputElt)
            .on('change', () => {
                log('change', this.value)
                designer.change(this.options.immaterial || false)
            })
            .on('input', () => {
                $(this.echoElt).text(this.inputElt.value)
            })
    }

    get value(): number {
        return parseFloat(this.inputElt.value)
    }

    set value(value: number) {
        this.inputElt.value = value.toString()
        $(this.echoElt).text(this.inputElt.value)
    }
}

export function slider(options: SliderOptions) {

    if (!Controls.current)
        return 0

    // remember default controls
    Controls.current.defaultValues[options.name] = options.value

    // create Slider
    let control = Controls.current.controls[options.name]
    if (!control) {
        log('new slider', options.min, options.max, options.step, options.value)
        control = new Slider(options)

        //.attr('id', 'slider-' + name
        Controls.current.controls[options.name] = control
    }
    log('value', options.name, control.value)
    return parseFloat(control.value)
}

//
// checkbox
//

type CheckboxOptions = {
    name: string,
    value: boolean,
}

class Checkbox implements Control<boolean> {

    elt: HTMLElement
    inputElt: HTMLInputElement

    constructor(options: CheckboxOptions) {

        this.elt = $('<span>').addClass('ui-checkbox')[0]
        this.inputElt = <HTMLInputElement>$('<input>').appendTo(this.elt)[0]

        $(this.inputElt)
            .attr('type', 'checkbox')
        this.inputElt.checked = options.value
    }

    activate() {
        $(this.inputElt)
            .on('change', () => {
                log('change', this.value)
                designer.change()
            })
    }

    get value(): boolean {
        return this.inputElt.checked
    }

    set value(value: boolean) {
        this.inputElt.checked = value
    }
}

export function checkbox(options: CheckboxOptions) {

    if (!Controls.current)
        return

    // remember default controls
    Controls.current.defaultValues[options.name] = options.value

    // create Checkbox
    let control = Controls.current.controls[options.name]
    if (!control) {
        log('new checkbox', options.value)
        control = new Checkbox(options)

        //.attr('id', 'checkbox-' + name
        Controls.current.controls[options.name] = control
    }
    log('value', options.name, control.value)
    return control.value
}

//
// Load
//

type LoadOptions = {
    name: string,
    value: string
}

class Load implements Control<string> {

    static none = 'none'

    static loaded: {[fn: string]: any} = {'none': new CSG()}


    static load = (fn: string) => {
        let csg = Load.loaded[fn]
        if (!csg) {
            lib.time('read stl', () => {
                //const data = fs.readFileSync(fn)
                //csg = io.stlDeSerializer.deserialize(data, fn, {output: 'csg'})
                //csg = lib.parseSTLA(data)
                csg = lib.readSTL(fn)
            })
            Load.loaded[fn] = csg
        }
        return csg
    }

    elt: HTMLSelectElement

    constructor(options: LoadOptions) {

        const addOptions = (dn: string) => {
            fs.readdirSync(dn).forEach(name => {
                const fn = path.join(dn, name)
                if (fs.statSync(fn).isDirectory()) {
                    addOptions(fn)
                } else if (name.endsWith('.stl')) {
                    $('<option>').attr('value', fn).text(name).appendTo(this.elt)
                }
            })
        }

        this.elt = <HTMLSelectElement>$('<select>')[0]
        $('<option>').attr('value', Load.none).text(Load.none).appendTo(this.elt)
        addOptions('../imports')
        this.elt.value = options.value || Load.none
    }

    activate() {
        $(this.elt)
            .on('change', () => {
                log('change', this.value)
                designer.change()
            })
    }

    get value(): string {
        return this.elt.value
    }

    set value(value: string) {
        this.elt.value = value
    }
}

export function load(options: LoadOptions) {

    if (!Controls.current)
        return

    // remember default controls
    Controls.current.defaultValues[options.name] = options.value

    // create Load
    let control = Controls.current.controls[options.name]
    if (!control) {
        log('new load', options.value)
        control = new Load(options)

        //.attr('id', 'load-' + name
        Controls.current.controls[options.name] = control
    }
    log('value', options.name, control.value)

    // load and return it
    return Load.load(control.value)
}



//
// Curve
// 

type Pt = {x: number, y: number}

abstract class Fun {

    pts: Pt[]
    minPts: number
    maxPts: number

    constructor(pts: Pt[], minPts: number = 1, maxPts: number = Infinity) {
        if (pts.length > maxPts)
            throw 'too many points'
        if (pts.length < minPts)
            throw 'too few points'
        this.pts = pts
        this.minPts = minPts
        this.maxPts = maxPts
    }

    abstract bind(): (x: number) => number

    sort() {
        this.pts.sort((p, q) => p.x - q.x)
    }

    rescale() {
        const curve = this.bind()
        let max = 0
        for (var i = 0; i <= 100; i++) {
            const y = curve(i / 100)
            if (y > max) max = y
        }
        if (max < 0.95 || max > 1.05) // avoid creeping rescale
            for (let i = 0; i < this.pts.length; i++)
                this.pts[i].y /= max
    }

    add(p: Pt) {
        if (this.pts.length >= this.maxPts) {
            designer.message('too many points')
            return
        }
        this.pts.push(p)
        log('pts', this.pts)
    }

    remove(i: number) {
        if (this.pts.length <= this.minPts) {
            designer.message('too few points')
            return
        }
        this.pts.splice(i, 1)
    }

}

abstract class Parametric extends Fun {
    
    abstract fun(x: number, parms: number[]): number

    parms: number[]

    constructor(pts: Pt[], minPts: number = 1, maxPts: number = Infinity) {
        super(pts, minPts, maxPts)
        this.parms = this.pts.map(() => 0)
    }

    bind() {
        const norm = (v: number[]) => Math.sqrt(v.reduce((a, b) => a + b**2, 0))
        const err = (parms: number[]) => norm(this.pts.map((p) => p.y - this.fun(p.x, parms)))
        const soln = numeric.uncmin(err, this.parms)
        this.parms = soln.solution
        log('soln', soln.iterations, soln.f, this.parms.join(','))
        return (x: number) => this.fun(x, this.parms)
    }

    add(p: Pt) {
        super.add(p)
        this.parms.push(0)
    }

    remove(i: number) {
        super.remove(i)
        this.parms.pop()
    }
}

class Fourier extends Parametric {

    wave: number

    constructor(pts: Pt[], wave: number) {
        super(pts)
        this.wave = wave
    }

    fun(x: number, parms: number[]): number {
        let v = parms[0]
        const f = 2 * Math.PI / this.wave
        for (let i = 1; 2*i-1 < parms.length; i++) {
            v += parms[2*i-1] * Math.sin(f * i * x)
            if (2*i >= parms.length)
                break
            v += parms[2*i] * Math.cos(f * i * x)
        }
        return v
    }
}

class Polynomial extends Parametric {

    fun(x: number, parms: number[]): number {
        let v = 0
        let xn = 1
        for (const p of parms) {
            v += p * xn
            xn *= x
        }
        return v
    }
}

class Hybrid extends Parametric {

    constructor(pts: Pt[]) {
        super(pts, 5, 5)
        this.parms = [1, 0.5, 0, 0, 0.5]
    }

    fun(x: number, parms: number[]): number {
        const f = parms[0] * 2 * Math.PI
        const a = parms[1]
        const b = parms[2]
        const c = parms[3]
        const d = parms[4]
        return a * Math.sin(f * x) + b * Math.cos(f * x) + c * x + d
    }
}

type SplineFactory = (xs: number[], ys: number[]) => spline.UniFunction

class Spline extends Fun {

    static kinds: {[kind: string]: {factory: SplineFactory, minPts: number}}  = {
        'akima': {factory: spline.createAkimaSplineInterpolator, minPts: 5},
        'cubic': {factory: spline.createCubicSplineInterpolator, minPts: 3},
        'linear': {factory: spline.createLinearInterpolator, minPts: 2}
    }

    factory: SplineFactory

    constructor(pts: Pt[], kind: string) {
        super(pts, Spline.kinds[kind].minPts)
        this.factory = Spline.kinds[kind].factory
    }

    bind() {
        this.sort()
        return this.factory(this.pts.map((p) => p.x), this.pts.map((p) => p.y))
    }
}

class CatRom extends Fun {

    knot: number

    constructor(pts: Pt[], knot: number) {
        super(pts, 2)
        this.knot = knot
    }

    bind() {
        this.sort()
        const p0 = {x: this.pts[0].x - 1e-6, y: this.pts[0].y}
        const p1 = {x: this.pts[this.pts.length-1].x + 1e-6, y: this.pts[this.pts.length-1].y}
        const pts = [p0].concat(this.pts, [p1])
        const samples: number[][] = catrom(pts.map((p) => [p.x, p.y]), {samples: 10, knot: this.knot})
        samples.sort((p: number[], q: number[]) => p[0] - q[0])
        const xpoints: number[] = []
        const ypoints: number[] = []
        for (let i = 0; i < samples.length; i++) {
            if (i==0 || samples[i][0] != samples[i-1][0]) {
                xpoints.push(samples[i][0])
                ypoints.push(samples[i][1])
            }
        }
        return spline.createLinearInterpolator(xpoints, ypoints)
    }
}

type CurveValue = {kind: string, pts: Pt[]}

class Curve implements Control<CurveValue> {
    
    static kinds: {[name: string]: (pts: Pt[]) => Fun} = {
        'cubic': (pts: Pt[]) => new Spline(pts, 'cubic'),
        'akima': (pts: Pt[]) => new Spline(pts, 'akima'),
        'cat-rom': (pts: Pt[]) => new CatRom(pts, 0.5),
        'linear': (pts: Pt[]) => new Spline(pts, 'linear'),
        'poly': (pts: Pt[]) => new Polynomial(pts),
        '¼ wave': (pts: Pt[]) => new Fourier(pts, 4),
        '½ wave': (pts: Pt[]) => new Fourier(pts, 2),
        '1 wave': (pts: Pt[]) => new Fourier(pts, 1),
        'hybrid': (pts: Pt[]) => new Hybrid(pts),
    }

    elt: HTMLCanvasElement
    kind: string
    fun: Fun

    constructor(kind: string, pts: Pt[]) {

        this.elt = <HTMLCanvasElement>$('<canvas>')
            .attr('width', Curve.width * Curve.factor)
            .attr('height', Curve.height * Curve.factor)
            .css('width', Curve.width + 'px')
            .css('height', Curve.height + 'px')
        [0]

        this.kind = Curve.kinds[kind]? kind : Object.keys(Curve.kinds)[0]
        this.fun = Curve.kinds[this.kind](pts)
        this.draw(true)
    }

    get value() {
        return {kind: this.kind, pts: this.fun.pts}
    }

    set value(value) {
        this.kind = value.kind
        this.fun = Curve.kinds[this.kind](value.pts)
        this.draw(true)
    }

    // curve widget dimensions
    // xxx use css?
    static width = 200
    static height = 80
    static padX = 6
    static padY = 10
    static factor = 2
    static radius = 5

    // curve coordinates to screen
    // divide by Curve.factor to get mouse coordinates
    static toScreen = (x: number, y: number) => { return {
        x: (x * (Curve.width - 2*Curve.padX) + Curve.padX) * Curve.factor,
        y: ((1-y) * (Curve.height - 2*Curve.padY) + Curve.padY) * Curve.factor
    }}

    // mouse coordinates to curve coordinates
    fromMouse(e: any) {
        const rect = this.elt.getBoundingClientRect();
        let x = e.clientX! - rect.left, y = e.clientY - rect.top
        x = (x - Curve.padX) / (Curve.width - 2 * Curve.padX)
        y = 1 - (y - Curve.padY) / (Curve.height - 2 * Curve.padY)
        return {x, y}
    }

    // which control point event is targeted at
    hit(e: any) {
        const rect = e.target.getBoundingClientRect()
        const pts = this.fun.pts
        let x = e.clientX! - rect.left, y = e.clientY! - rect.top
        for (let i = 0; i < pts.length; i++) {
            const s = Curve.toScreen(pts[i].x, pts[i].y)
            if ((x - s.x/Curve.factor)**2 + (y - s.y/Curve.factor)**2 < Curve.radius**2)
                return i
        }
        return -1
    }

    draw(final: boolean) {

        const lineTo = (x: number, y: number) => {const s = Curve.toScreen(x, y); ctx.lineTo(s.x, s.y)}
        const moveTo = (x: number, y: number) => {const s = Curve.toScreen(x, y); ctx.moveTo(s.x, s.y)}
        const arc = (x: number, y: number, r: number, a: number, b: number) => {const s = Curve.toScreen(x, y); ctx.arc(s.x, s.y, r, a, b)}

        // reset canvas state
        this.elt.width = this.elt.width

        // get the curve function
        if (final)
            this.fun.rescale()
        const curve = this.fun.bind()

        // draw the curve
        const ctx = this.elt.getContext("2d")!
        let s: {x: number, y: number}
        ctx.strokeStyle = 'rgb(0,0,0)'
        ctx.fillStyle = final? 'rgb(250,250,250)' : 'rgb(245,245,245)'
        ctx.lineWidth = Curve.factor * 1
        ctx.beginPath()
        const n = 100
        moveTo(0, 0)
        for (let i = 0; i <= n; i++) {
            const x = i / n
            lineTo(x, curve(x))
        }
        lineTo(1, 0)
        lineTo(0, 0)
        ctx.stroke()
        ctx.fill()

        // draw the control points
        for (const p of this.fun.pts) {
            ctx.strokeStyle = 'rgb(255,0,0)'
            ctx.lineWidth = Curve.factor * 1
            ctx.beginPath()
            arc(p.x, p.y, Curve.radius * Curve.factor, 0, 2*Math.PI);
            ctx.stroke()
        }
    }

    activate() {

        // add kind selector underneath name
        const kindSelect = <HTMLSelectElement>$('<select>')
            .on('change', () => {
                try {
                    this.fun = Curve.kinds[kindSelect.value](this.fun.pts)
                    this.kind = kindSelect.value
                    this.draw(true)
                    designer.change()
                } catch (e) {
                    designer.message(e)
                    kindSelect.value = this.kind
                }
            })
        [0]
        for (const kind in Curve.kinds)
            $('<option>').attr('value', kind).text(kind).appendTo(kindSelect)
        $('#ui-table tr:last-child .ui-name').addClass('curve-name').append(kindSelect)
        kindSelect.value = this.kind

        $(this.elt).on('mousedown', (e) => {

            // which point are we moving (if any)?
            const moving = this.hit(e)
            if (moving < 0)
                return
            const pts = this.fun.pts.slice(0) // work on copy because points will be resorted by Fun

            const mousemove = (e: any) => {
                let {x, y} = this.fromMouse(e)
                x = Math.min(Math.max(x, 0), 1) + Math.random() * 1e-5 // avoid equal xs
                y = Math.min(Math.max(y, 0), 1)
                pts[moving] = {x, y}
                this.fun.pts = pts.slice(0)
                this.draw(false)
            }
            $(this.elt).on('mousemove', mousemove);
            $(window).on('mousemove', mousemove)

            const mouseup = () => {
                $(this.elt).unbind('mousemove', mousemove)
                $(this.elt).unbind('mouseup', mouseup)
                $(window).unbind('mousemove', mousemove)
                $(window).unbind('mouseup', mouseup)
                this.draw(true)
                designer.change()
            }
            $(this.elt).on('mouseup', mouseup)
            $(window).on('mouseup', mouseup)

            window.addEventListener('click', (e) => {
                e.stopPropagation()
            }, {capture: true, once: true})
        })

        $(this.elt).on('dblclick', (e) => {
            const i = this.hit(e)
            if (i < 0)
                this.fun.add(this.fromMouse(e))
            else
                this.fun.remove(i)
            this.draw(true)
            designer.change()
        })
            
    }
}

export function curve(options: {
    name: string,
    kind: string,
    pts: Pt[],
    scale: number
}) {

    if (!Controls.current)
        return

    // remember default controls
    Controls.current.defaultValues[options.name] = {kind: options.kind, pts: options.pts}

    // create Curve
    let control = Controls.current.controls[options.name]
    if (!control) {
        log('new curve')
        control = new Curve(options.kind, options.pts)
        Controls.current.controls[options.name] = control
    }
    const scale = options.scale || 1
    const fun = (<Curve>control).fun.bind()
    return (s: number) => fun(s) * scale
}

