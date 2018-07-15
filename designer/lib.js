// xxx can we use typescript here?

"use strict";
exports.__esModule = true;

var log = require("electron").remote.getGlobal('console').log;

var CSG = require('@jscad/CSG').CSG

const vec3 = exports.vec3 = (...args) => (args instanceof CSG.Vector3D? args : new CSG.Vector3D(...args))
const vec2 = (...args) => (args instanceof CSG.Vector2D? args : new CSG.Vector3D(...args))
const vtx = (...args) => new CSG.Vertex(...args)
const poly = (...args) => new CSG.Polygon(...args)

function override(oldOptions, newOptions) {
    return Object.assign({}, oldOptions, newOptions)
}

function line(start, end) {
    return (s) => vec3(start).times(1-s).plus(vec3(end).times(s))
}
exports.line = line

function wave(start, end, min, max) {
    return (s) => {
        s = (1-s) * start + s * end
        return (Math.sin(s * 2 * Math.PI) + 1) * (max - min) + min
    }
}
exports.wave = wave

function empty() {
    return new CSG()
}
exports.empty = empty

function shell(options) {

    options = options || {};
    var wedges = Math.floor(options.wedges) || 16;
    var slices = Math.floor(options.slices) || 16;
    var path = options.path || line(vec3(0, -0.5, 0), vec3(0, 0.5, 0))
    var radius = options.radius || (() => 0.5);
    var twist = options.twist || 0
    var flipped = options.flipped || false
    var sliceSteps = options.sliceSteps
    var wedgeSteps = options.wedgeSteps

    var shell = [];
    var rim0 = []
    var rim1 = []

    if (!sliceSteps || !wedgeSteps) {

        function steps(f, n) {
            const eps = 1e-6
            const tangent = (x) => vec2(eps, f(x+eps/2) - f(x-eps/2)).unit()
            const angle = (v0, v1) => Math.acos(v1.dot(v0)) // assumes unit vectors
            var minStep = 1 / n / 100
            var maxStep = 2 / n
            var x0 = 0
            var pt0 = vec2(x0, f(x0))
            var tan0 = tangent(x0)
            var xs = [x0]
            for (var x1 = minStep; x1 <= 1; x1 += minStep) {
                if (x1 >= 1 - minStep)
                    x1 = 1
                var pt1 = vec2(x1, f(x1))
                var tan1 = tangent(x1)
                var chord = pt1.minus(pt0).unit()
                if (angle(chord, tan0) > maxAngle || angle(chord, tan1) > maxAngle || x1 - x0 > maxStep || x1 == 1) {
                    xs.push(x1)
                    x0 = x1
                    pt0 = pt1
                    tan0 = tan1
                }
            }
            return xs //= xs.map((s) => s / xs[xs.length - 1])
        }

        const detail = slices // xxx

        // profile in vertical (slice) dimension
        const fSlice = (x) => radius(x, 0)
        const nSlice = detail + 1

        // compute dimensions: diameter, widest point, height
        var maxRadius = 0
        var maxRadiusAt
        for (var s = 0; s <= 1; s += 1e-3) {
            const r = fSlice(s)
            if (r > maxRadius) {
                maxRadius = r
                maxRadiusAt = s
            }
        }
        var height = path(1).minus(path(0)).length()

        // profile in horizontal (wedge) dimension
        const fWedge = (a) => radius(maxRadiusAt, a)
        const nWedge = 2 * Math.PI * maxRadius / height * detail + 1
        log('detail', detail, 'height', height, 'maxRadius', maxRadius, 'maxRadiusAt', maxRadiusAt, 'nWedge', nWedge)
        
        // find an a that produces the expected number of facets, detail**2
        var maxAngle = 1e-3 // xxx   / n/ 10 //minStep
        for (var i = 0; i < 10; i++) {
            sliceSteps = steps(fSlice, nSlice)
            wedgeSteps = steps(fWedge, nWedge)
            maxAngle *= (sliceSteps.length * wedgeSteps.length) / (detail**2)
            log('sliceSteps.length', sliceSteps.length, 'wedgeSteps.length', wedgeSteps.length)
        }
    }

    for (var is = 1; is < sliceSteps.length; is++) {

        // step along the path
        var s0 = sliceSteps[is-1]
        var s1 = sliceSteps[is]
        var p0 = path(s0)
        var p1 = path(s1)

        var axisZ = p1.minus(p0).unit()
        var isY = Math.abs(axisZ.y) > 0.5? 1 : 0;
        var axisX = vec3(isY, 1-isY, 0).cross(axisZ).unit();
        var axisY = axisX.cross(axisZ).unit();
        
        //for (var iw = 0; iw < wedges; iw++) {

            //var w0 = (iw / wedges)
            //var w1 = ((iw+1) / wedges)

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

            function point(p, r, w) {
                var angle = w * Math.PI * 2;
                var out = axisX.times(Math.cos(angle)).plus(axisY.times(Math.sin(angle)));
                var pos = p.plus(out.times(r));
                return vtx(pos/*, out.unit()*/);
            }

            //  p00 p01
            //  p10 p11

            var p00 = point(p0, r00, w00)
            var p01 = point(p0, r01, w01)
            var p10 = point(p1, r10, w10)
            var p11 = point(p1, r11, w11)

            function add(...args) {
                shell.push(flipped? poly(args.reverse()) : poly(args))
            }

            if (s0 == 0)
                rim0.push(p00)
            if (twist < 0) {
                if (r10 != 0 || r11 != 0) add(p00, p10, p11)
                if (r01 != 0 || r00 != 0) add(p11, p01, p00)
            } else {
                if (r00 != 0 || r01 != 0) add(p01, p00, p10)
                if (r11 != 0 || r10 != 0) add(p10, p11, p01)
            }
            if (s1 == 1)
                rim1.push(p10)
        }
    }

    return {shell, rim0, rim1, sliceSteps, wedgeSteps}
};

function cap(pts, pt, flipped) {
    var cap = []
    for (var i = 0; i < pts.length; i++) {
        var ply = [pts[i], pts[(i+1)%pts.length], vtx(pt)]
        cap.push(poly(flipped? ply.reverse() : ply))
    }
    return cap
}


function rod(options) {

    options = options || {};
    var wedges = Math.floor(options.wedges) || 16;
    var slices = Math.floor(options.slices) || 16;
    var path = options.path || line(vec3(0, -0.5, 0), vec3(0, 0.5, 0))
    var radius = options.radius || (() => 0.5);
    var twist = options.twist || 0

    var s = shell(options)
    var cap0 = cap(s.rim0, path(0), false)
    var cap1 = cap(s.rim1, path(1), true)
    var polygons = [s.shell, cap0, cap1].reduce((a,b) => a.concat(b))
    return CSG.fromPolygons(polygons)
}
exports.rod = rod

function cone(options) {

    options = options || {}
    var radius = options.radius || 0.5
    var base = options.base || [0, -0.5, 0]
    var tip = options.tip || [0, 0.5, 0]
    var path = line(base, tip)

    var s = shell(override(options, {
        radius: (s) => (1-s) * radius,
        path
    }))
    var cap0 = cap(s.rim0, path(0), false)
    var polygons = s.shell.concat(cap0)
    return CSG.fromPolygons(polygons)
}
exports.cone = cone

function tube(options) {

    options = options || {};
    var radius = options.radius || (() => 1);
    var thickness = options.thickness || (() => 0.1)

    var outer = rod(options)

    var inner = rod(override(options, {
        radius: (s) => radius(s) - thickness(s)
    }))

    return outer.subtract(inner)
}
exports.tube = tube

function vase(options) {

    options = options || {};
    var radius = options.radius || (() => 1);
    var thickness = options.thickness || (() => 0.1) // relative to diameter
    var path = options.path || line(vec3(0, 0, -1), vec3(0, 0, 1))
    var base = options.base==undefined? 1 : options.base // relative to thickness at base

    // outer
    var outer = shell(override(options, {
        path: path
    }))
    var outerCap = cap(outer.rim0, path(0), false)

    // inner
    var height = path(1).minus(path(0)).length()
    log('xxx', path(1).minus(path(0)), path(1).minus(path(0)).length())
    var b = thickness(0, 0) * 2 * radius(0, 0)/ height // xxx min thickness over all a
    const ss = (s) => b + (1-b) * s
    var inner = shell(override(options, {
        path: (s) => path(ss(s)),
        radius: (s, a) => radius(ss(s), a) - thickness(ss(s), a),
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
exports.vase = vase


