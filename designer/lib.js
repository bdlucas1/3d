// xxx can we use typescript here?

"use strict";
exports.__esModule = true;

var log = require("electron").remote.getGlobal('console').log;

var CSG = require('@jscad/CSG').CSG

const vec3 = (...args) => (args instanceof CSG.Vector3D? args : new CSG.Vector3D(...args))
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

    var shell = [];
    var rim0 = []
    var rim1 = []

    // compute variable length steps with goal to ensure a maximum angle between adjacent steps
    var minStep = 1 / slices / 10
    var maxStep = 1.5 / slices
    var steps
    var a = minStep
    for (var i = 0; i < 5; i++) {
        const r = (s) => radius(s, 0)
        var p0 = vec2(-minStep, r(-minStep))
        var p1 = vec2(0, r(0))
        steps = [0]
        for (var s = minStep; s <= 1; s += minStep) {
            var p2 = vec2(s, r(s))
            var d01 = p1.minus(p0).unit()
            var d12 = p2.minus(p1).unit()
            if (Math.acos(d01.dot(d12)) > a || s - steps[steps.length-1] > maxStep) {
                steps.push(s)
                p0 = p1
                p1 = p2
            }
        }
        a *= steps.length / slices
    }
    steps = steps.map((s) => s / steps[steps.length - 1])
    log(steps.length + ' steps')
            
    for (var i = 1; i < steps.length; i++) {

        // step along the path
        var s0 = steps[i-1]
        var s1 = steps[i]
        var p0 = path(s0)
        var p1 = path(s1)

        var axisZ = p1.minus(p0).unit()
        var isY = Math.abs(axisZ.y) > 0.5? 1 : 0;
        var axisX = vec3(isY, 1-isY, 0).cross(axisZ).unit();
        var axisY = axisX.cross(axisZ).unit();
        
        for (var iw = 0; iw < wedges; iw++) {

            var w0 = (iw / wedges)
            var w1 = ((iw+1) / wedges)

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

    return {shell, rim0, rim1}
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
    var path = options.path || line(vec3(0, -1, 0), vec3(0, 1, 0))
    var base = options.base==undefined? 1 : options.base // relative to thickness at base

    // outer
    var outer = shell(override(options, {
        path: path
    }))
    var outerCap = cap(outer.rim0, path(0), false)

    // inner
    var height = path(1).y - path(0).y
    var b = thickness(0, 0) * 2 * radius(0, 0)/ height // xxx min thickness over all a
    const ss = (s) => b + (1-b) * s
    var inner = shell(override(options, {
        path: (s) => path(ss(s)),
        radius: (s, a) => radius(ss(s), a) - thickness(ss(s), a),
        flipped: true
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


