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
    var wedges = options.wedges || 16;
    var slices = options.slices || 16;
    var path = options.path || line(vec3(0, -0.5, 0), vec3(0, 0.5, 0))
    var radius = options.radius || (() => 0.5);

    var polygons = [];

    function point(p, r, w) {
        var angle = w * Math.PI * 2;
        var out = axisX.times(Math.cos(angle)).plus(axisY.times(Math.sin(angle)));
        var pos = p.plus(out.times(r));
        return vtx(pos);
    }

    for (var is = 0; is < slices; is++) {

        var p0 = path(is / slices)
        var p1 = path((is+1) / slices)

        var r0 = radius(is / slices)
        var r1 = radius((is+1) / slices)

        var axisZ = p1.minus(p0).unit()
        var isY = Math.abs(axisZ.y) > 0.5? 1 : 0;
        var axisX = vec3(isY, 1-isY, 0).cross(axisZ).unit();
        var axisY = axisX.cross(axisZ).unit();
        
        var v0 = vtx(p0);
        var v1 = vtx(p1);
        
        for (var iw = 0; iw < wedges; iw++) {

            var w0 = iw / wedges
            var w1 = (iw + 1) / wedges;

            if (is == 0)
                polygons.push(poly([v0, point(p0, r0, w0), point(p0, r0, w1)]));
            polygons.push(poly([point(p0, r0, w1), point(p0, r0, w0), point(p1, r1, w0), point(p1, r1, w1)]));
            if (is == slices-1)
                polygons.push(poly([v1, point(p1, r1, w1), point(p1, r1, w0)]));
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
    var thickness = options.thickness || (() => 0.1)
    var path = options.path || line(vec3(0, -1, 0), vec3(0, 1, 0))
    var base = options.base==undefined? 0.1 : options.base

    var outer = rod(override(options, {
        path: path
    }))

    const ss = (s) => base + (1-base) * s
    var inner = rod(override(options, {
        path: (s) => path(ss(s)),
        radius: (s) => radius(ss(s)) - thickness(ss(s))
    }))

    const vase = outer.subtract(inner)
    vase.outer = outer
    vase.inner = inner
    return vase
}
exports.vase = vase

