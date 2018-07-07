// xxx can we use typescript here?

"use strict";
exports.__esModule = true;

var log = require("electron").remote.getGlobal('console').log;

var CSG = require('@jscad/CSG').CSG

const vec3 = (...args) => (args instanceof CSG.Vector3D? args : new CSG.Vector3D(...args))
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

function rod(options) {

    options = options || {};
    var wedges = Math.floor(options.wedges) || 16;
    var slices = Math.floor(options.slices) || 16;
    var path = options.path || line(vec3(0, -0.5, 0), vec3(0, 0.5, 0))
    var radius = options.radius || (() => 0.5);
    var twist = options.twist || 0

    var polygons = [];

    for (var is = 0; is < slices; is++) {

        var p0 = path(is / slices)
        var p1 = path((is+1) / slices)

        var axisZ = p1.minus(p0).unit()
        var isY = Math.abs(axisZ.y) > 0.5? 1 : 0;
        var axisX = vec3(isY, 1-isY, 0).cross(axisZ).unit();
        var axisY = axisX.cross(axisZ).unit();
        
        for (var iw = 0; iw < wedges; iw++) {

            var w0 = (iw / wedges)
            var w1 = ((iw+1) / wedges)

            var w00 = (is / slices) * twist + w0
            var w01 = (is / slices) * twist + w1
            var w10 = ((is+1) / slices) * twist + w0
            var w11 = ((is+1) / slices) * twist + w1

            var r00 = radius(is / slices, w0)
            var r01 = radius(is / slices, w1)
            var r10 = radius((is+1) / slices, w0)
            var r11 = radius((is+1) / slices, w1)

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

            if (is == 0 && r00 != 0 && r01 !=0) polygons.push(poly([vtx(p0), p00, p01]));
            if (twist < 0) {
                if (r10 != 0 || r11 != 0)       polygons.push(poly([p00, p10, p11]));
                if (r01 != 0 || r00 != 0)       polygons.push(poly([p11, p01, p00]));
            } else {
                if (r00 != 0 || r01 != 0)       polygons.push(poly([p01, p00, p10]));
                if (r11 != 0 || r10 != 0)       polygons.push(poly([p10, p11, p01]));
            }
            if (is == slices-1 && r11 != 0 && r10 !=0) polygons.push(poly([vtx(p1), p11, p10]));
        }
    }
    return CSG.fromPolygons(polygons);
};
exports.rod = rod

function cone(options) {

    options = options || {}
    var radius = options.radius || 0.5
    var base = options.base || [0, -0.5, 0]
    var tip = options.tip || [0, 0.5, 0]

    return rod(override(options, {
        radius: (s) => (1-s) * radius,
        path: line(base, tip)
    }))
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

    var outer = rod(override(options, {
        path: path
    }))

    var height = path(1).y - path(0).y
    var b = thickness(0, 0) * 2 * radius(0, 0)/ height // xxx min thickness over all a
    const ss = (s) => b + (1.01-b) * s
    var inner = rod(override(options, {
        path: (s) => path(ss(s)),
        radius: (s, a) => radius(ss(s), a) - thickness(ss(s), a)
    }))

    const vase = outer.subtract(inner)
    vase.outer = outer
    vase.inner = inner
    return vase
}
exports.vase = vase

