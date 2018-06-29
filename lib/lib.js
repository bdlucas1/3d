// xxx can we use typescript here?

"use strict";
exports.__esModule = true;

function line(start, end) {
    return (s) => start.times(1-s).plus(end.times(s))
}
exports.line = line

function wave(start, end, min, max) {
    return (s) => {
        s = (1-s) * start + s * end
        return (Math.sin(s * 2 * Math.PI) + 1) * (max - min) + min
    }
}
exports.wave = wave

function rod(options) {

    options = options || {};
    var wedges = options.wedges || 16;
    var slices = options.slices || 16;
    var path = options.path || line(new CSG.Vector(0, -1, 0), new CSG.Vector(0, 1, 0))
    var radius = options.radius || (() => 1);

    var polygons = [];

    function point(p, r, w, normalBlend) {
        var angle = w * Math.PI * 2;
        var out = axisX.times(Math.cos(angle)).plus(axisY.times(Math.sin(angle)));
        var pos = p.plus(out.times(r));
        // xxx does not take into account slope due to varying r
        var normal = out.times(1 - Math.abs(normalBlend)).plus(axisZ.times(normalBlend));
        return new CSG.Vertex(pos, normal);
    }

    for (var is = 0; is < slices; is++) {

        var p0 = path(is / slices)
        var p1 = path((is+1) / slices)

        var r0 = radius(is / slices)
        var r1 = radius((is+1) / slices)

        var axisZ = p1.minus(p0).unit()
        var isY = Math.abs(axisZ.y) > 0.5;
        var axisX = new CSG.Vector(isY, !isY, 0).cross(axisZ).unit();
        var axisY = axisX.cross(axisZ).unit();
        
        var v0 = new CSG.Vertex(p0, axisZ.negated());
        var v1 = new CSG.Vertex(p1, axisZ);
        
        for (var iw = 0; iw < wedges; iw++) {

            var w0 = iw / wedges
            var w1 = (iw + 1) / wedges;

            if (is == 0)
                polygons.push(new CSG.Polygon([v0, point(p0, r0, w0, -1), point(p0, r0, w1, -1)]));
            polygons.push(new CSG.Polygon([point(p0, r0, w1, 0), point(p0, r0, w0, 0), point(p1, r1, w0, 0), point(p1, r1, w1, 0)]));
            if (is == slices-1)
                polygons.push(new CSG.Polygon([v1, point(p1, r1, w1, 1), point(p1, r1, w0, 1)]));
        }
    }
    return CSG.fromPolygons(polygons);
};
exports.rod = rod

function tube(options) {

    options = options || {};
    var radius = options.radius || (() => 1);
    var thickness = options.thickness || (() => 0.1)

    var outer = rod(options)

    options.radius = (s) => radius(s) - thickness(s)
    var inner = rod(options)

    return outer.subtract(inner)
}
exports.tube = tube

function vase(options) {

    options = options || {};
    var radius = options.radius || (() => 1);
    var thickness = options.thickness || (() => 0.1)
     var path = options.path || line(new CSG.Vector(0, -1, 0), new CSG.Vector(0, 1, 0))
    var base = options.base==undefined? 0.1 : options.base

    options.path = path
    var outer = rod(options)

    const ss = (s) => base + (1-base) * s
    options.path = (s) => path(ss(s))
    options.radius = (s) => radius(ss(s)) - thickness(ss(s))
    var inner = rod(options)

    const vase = outer.subtract(inner)
    vase.outer = outer
    vase.inner = inner
    return vase
}
exports.vase = vase

