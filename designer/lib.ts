import {log, CSG, ui} from './designer'

export function time(name: string, f: () => void) {
    const t0 = new Date().getTime()
    f()
    const t = new Date().getTime() - t0
    log('time:', name, t, 'ms')
}

export interface Vec3 {
    x: number
    y: number
    z: number
    plus(q: Vec3): Vec3
    minus(q: Vec3): Vec3
    times(m: number): Vec3
    dot(q: Vec3): number
    cross(q: Vec3): Vec3
    unit(): Vec3
    length(): number
}

export function vec3(x: number, y: number, z: number) {
    return new CSG.Vector3D(x, y, z)
}

export function prt(p: Vec3) {
    return '(' + p.x + ',' + p.y + ',' + p.z + ')'
}

export interface Vec2 {
    x: number
    y: number
    z: number
    plus(q: Vec2): Vec2
    minus(q: Vec2): Vec2
    times(m: number): Vec2
    dot(q: Vec2): number
    cross(q: Vec2): Vec2
    unit(): Vec2
    length(): number
}

export function vec2(...args: any[]) {
    return new CSG.Vector2D(...args)
}

export function eq(p: Vec3, q: Vec3) {
    return p.x==q.x && p.y==q.y && p.z==q.z
}

export interface Poly {
}

export function poly(...args: Vtx[]): Poly {
    return new CSG.Polygon(...args)
}

export interface Vtx {
}

export function vtx(v: Vec3): Vtx {
    return new CSG.Vertex(v)
}

// cheap alternative to union
export function combine(...csgs: CSG[]) {
    let polys: CSG[] = []
    for (const csg of csgs)
        polys = polys.concat(csg.polygons)
    return CSG.fromPolygons(polys)
}

//
//
//

function override(oldOptions: {}, newOptions: {}) {
    return Object.assign({}, oldOptions, newOptions)
}

export function line(start: Vec3, end: Vec3) {
    return (s: number) => start.times(1-s).plus(end.times(s))
}

function wave(start: number, end: number, min: number, max: number) {
    return (s: number) => {
        s = (1-s) * start + s * end
        return (Math.sin(s * 2 * Math.PI) + 1) * (max - min) + min
    }
}

export function shoulders(s0: number, s1: number, outer: number, inner: number) {
    return (s: number) => {
        let v = 1
        if (s < s0)
            v = Math.sqrt(1 - (1 - s / s0) ** 2)
        else if (1 - s < s1)
            v = Math.sqrt(1 - (1 - (1 - s) / s1) ** 2)
        return (outer - inner) * v + inner
    }
}

export function circle(a0: number, a1: number, r: number) {
    return (s: number) => {
        const a = (a0 + s * (a1 - a0)) * 2 * Math.PI
        return vec3(r * Math.sin(a), r * Math.cos(a), 0)
    }
}

export function empty() {
    return new CSG()
}

function _shell(options: any) {

    options = options || {};
    var detail = options.detail || 100
    var path = options.path || line(vec3(0, 0, -0.5), vec3(0, 0, 0.5))
    var radius = options.radius || (() => 0.5);
    var twist = options.twist || 0
    var flipped = options.flipped || false
    var sliceSteps = options.sliceSteps
    var wedgeSteps = options.wedgeSteps

    var shell: Poly[] = []
    var rim0: Vtx[] = []
    var rim1: Vtx[] = []

    const frame = (s: number) => {
        const eps = 1e-6
        const d = (f: (s: number) => Vec3) =>
            (s: number) => f(s+eps).minus(f(s)).times(1/eps).unit()
        const dp = d(path)
        const d2p = d(dp)
        const z = dp(s)
        let x = d2p(s)
        if (!isFinite(x.x) || !isFinite(x.y) || !isFinite(x.z)) {
            // straight line
            const isY = Math.abs(z.y) > 0.5? 1 : 0
            x = vec3(isY, 1-isY, 0).cross(z).unit()
        }
        const y = x.cross(z).unit()
        return {x, y}
    }

    const point = (p: Vec3, r: number, w: number, frame: {x: Vec3, y: Vec3}) => {
        const angle = w * Math.PI * 2;
        const out = frame.x.times(Math.cos(angle)).plus(frame.y.times(Math.sin(angle)));
        const pos = p.plus(out.times(r));
        return pos
    }

    if (!sliceSteps || !wedgeSteps) {

        const steps = (f: (x: number) => Vec3, n: number, maxAngle: number) => {
            const eps = 1e-6
            const tangent = (x: number) => f(x+eps/2).minus(f(x-eps/2)).unit()
            const angle = (v0: Vec3, v1: Vec3) => Math.acos(v1.dot(v0)) // unit vectors
            var minStep = 1 / n / 100
            var maxStep = 2 / n
            var x0 = 0
            var pt0 = f(x0)
            var tan0 = tangent(x0)
            var xs = [x0]
            for (var x1 = minStep; x1 <= 1; x1 += minStep) {
                if (x1 >= 1 - minStep)
                    x1 = 1
                var pt1 = f(x1)
                var tan1 = tangent(x1)
                var chord = pt1.minus(pt0).unit()
                if (angle(chord, tan0) > maxAngle || angle(chord, tan1) > maxAngle || x1 - x0 > maxStep || x1 == 1) {
                    //log('xxx pt0', prt(pt0), 'pt1', prt(pt1), 'tan0', prt(tan0), 'tan1', prt(tan1), 'chord', prt(chord))
                    //log('xxx angle(chord, tan0)', angle(chord, tan0), 'angle(chort, tan1)', angle(chord, tan1), 'maxAngle', maxAngle, 'x1-x0', x1-x0, 'maxStep', maxStep)
                    xs.push(x1)
                    x0 = x1
                    pt0 = pt1
                    tan0 = tan1
                }
            }
            return xs //= xs.map((s) => s / xs[xs.length - 1])
        }

        // compute length in slice direction, i.e. length of path
        var sliceLength = 0
        const ds = 1e-2
        for (var s = 0; s < 1; s += ds)
            sliceLength += path(s+ds).minus(path(s)).length()

        // compute dimensions: diameter, widest point
        var maxRadius = 0
        var maxRadiusAt = 0
        for (var s = 0; s <= 1; s += 1e-3) {
            const r = radius(s, 0)
            if (r > maxRadius) {
                maxRadius = r
                maxRadiusAt = s
            }
        }
        const wedgeLength = 2 * Math.PI * maxRadius

        // target slice and wedge counts; determines minimum and maximum slice and wedge counts via slice()
        const k = Math.sqrt((detail * detail) / (sliceLength * wedgeLength))
        const nWedge = wedgeLength * k
        const nSlice = sliceLength * k
        log('detail', detail, 'sliceLength', sliceLength, 'maxRadius', maxRadius, 'maxRadiusAt', maxRadiusAt, 'nWedge', nWedge, 'nSlice', nSlice)

        // profile in vertical (slice) dimension
        const fSlice = (x: number) => point(path(x), radius(x, 0), 0, frame(x))

        // profile in horizontal (wedge) dimension
        const fWedge = (x: number) => {
            const a = 2 * Math.PI * x
            const r = radius(maxRadiusAt, x)
            return vec3(r * Math.sin(a), r * Math.cos(a), 0)
        }
        
        // find an a that produces the expected number of facets, detail**2
        time('steps', () => {
            var maxAngle = 1e-3 // xxx   / n/ 10 //minStep
            for (var i = 0; i < 5; i++) {
                sliceSteps = steps(fSlice, nSlice, maxAngle)
                wedgeSteps = steps(fWedge, nWedge, maxAngle)
                maxAngle *= (sliceSteps.length * wedgeSteps.length) / (detail**2)
                log('sliceSteps.length', sliceSteps.length, 'wedgeSteps.length', wedgeSteps.length)
            }
        })
    }

    time("construct", () => {

        for (var is = 1; is < sliceSteps.length; is++) {

            // step along the path
            const s0 = sliceSteps[is-1]
            const s1 = sliceSteps[is]
            const p0 = path(s0)
            const p1 = path(s1)

            const frame0 = frame(s0)
            const frame1 = frame(s1)

            for (var iw = 1; iw < wedgeSteps.length; iw++) {

                var w0 = wedgeSteps[iw-1]
                var w1 = wedgeSteps[iw]

                var w00 = (s0) * twist + w0
                var w01 = (s0) * twist + w1
                var w10 = (s1) * twist + w0
                var w11 = (s1) * twist + w1

                var r00 = radius(s0, w0)
                var r01 = radius(s0, w1)
                var r10 = radius(s1, w0)
                var r11 = radius(s1, w1)

                //  v00 v01
                //  v10 v11
                var v00 = vtx(point(p0, r00, w00, frame0))
                var v01 = vtx(point(p0, r01, w01, frame0))
                var v10 = vtx(point(p1, r10, w10, frame1))
                var v11 = vtx(point(p1, r11, w11, frame1))

                const add = (...args: Poly[]) => {
                    shell.push(flipped? poly(args.reverse()) : poly(args))
                }

                if (s0 == 0)
                    rim0.push(v00)
                if (twist < 0) {
                    if (r10 != 0 || r11 != 0) add(v00, v10, v11)
                    if (r01 != 0 || r00 != 0) add(v11, v01, v00)
                } else {
                    if (r00 != 0 || r01 != 0) add(v01, v00, v10)
                    if (r11 != 0 || r10 != 0) add(v10, v11, v01)
                }
                if (s1 == 1)
                    rim1.push(v10)
            }
        }

    }) // time

    return {shell, rim0, rim1, sliceSteps, wedgeSteps}
};

export function shell(options: any) {
    return CSG.fromPolygons(_shell(options).shell)
}

function cap(pts: Vtx[], pt: Vec3, flipped: boolean) {
    var cap = []
    for (var i = 0; i < pts.length; i++) {
        var ply = [pts[i], pts[(i+1)%pts.length], vtx(pt)]
        cap.push(poly(flipped? ply.reverse() : ply))
    }
    return cap
}


export function rod(options: any) {

    options = options || {};
    var wedges = Math.floor(options.wedges) || 16;
    var slices = Math.floor(options.slices) || 16;
    var path = options.path || line(vec3(0, 0, -0.5), vec3(0, 0, 0.5))
    var radius = options.radius || (() => 0.5);
    var twist = options.twist || 0

    var s = _shell(options)
    var cap0 = cap(s.rim0, path(0), false)
    var cap1 = cap(s.rim1, path(1), true)
    var polygons = [s.shell, cap0, cap1].reduce((a,b) => a.concat(b))
    return CSG.fromPolygons(polygons)
}

export function cone(options: any) {

    options = options || {}
    var radius = options.radius || 0.5
    var base = options.base || [0, -0.5, 0]
    var tip = options.tip || [0, 0.5, 0]
    var path = line(base, tip)

    var s = _shell(override(options, {
        radius: (s: number) => (1-s) * radius,
        path
    }))
    var cap0 = cap(s.rim0, path(0), false)
    var polygons = s.shell.concat(cap0)
    return CSG.fromPolygons(polygons)
}

export function tube(options: any) {

    options = options || {};
    var radius = options.radius || (() => 1);
    var thickness = options.thickness || (() => 0.1)

    var outer = rod(options)

    var inner = rod(override(options, {
        radius: (s: number) => radius(s) - thickness(s)
    }))

    return outer.subtract(inner)
}

export function vase(options: any) {

    options = options || {};
    var radius = options.radius || (() => 1);
    var thickness = options.thickness || (() => 0.1) // relative to diameter
    var path = options.path || line(vec3(0, 0, 0), vec3(0, 0, 1))
    var base = options.base==undefined? 1 : options.base // relative to thickness at base

    // outer
    var outer = _shell(override(options, {
        path: path
    }))
    var outerCap = cap(outer.rim0, path(0), false)

    // inner
    var height = path(1).minus(path(0)).length()
    var b = thickness(0, 0) * 2 * radius(0, 0)/ height // xxx min thickness over all a
    const ss = (s: number) => b + (1-b) * s
    var inner = _shell(override(options, {
        path: (s: number) => path(ss(s)),
        radius: (s: number, a: number) => radius(ss(s), a) - thickness(ss(s), a),
        flipped: true,
        sliceSteps: outer.sliceSteps,
        wedgeSteps: outer.wedgeSteps
    }))
    var innerCap = cap(inner.rim0, path(ss(0)), true)

    // rim
    var rim = []
    const n = inner.rim1.length
    for (var i = 0; i < n; i++)
        rim.push(poly([inner.rim1[i], inner.rim1[(i+1)%n], outer.rim1[(i+1)%n], outer.rim1[i]]))

    // put it all together
    var polygons = [
        inner.shell,
        innerCap,
        outer.shell,
        outerCap,
        rim
    ].reduce((a,b) => a.concat(b))
    return CSG.fromPolygons(polygons)
}


