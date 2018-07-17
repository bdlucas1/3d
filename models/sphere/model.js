"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//const log = require('../../designer/designer.js').log
var CSG = require('@jscad/csg').CSG;
var log = require('./designer.js').log;
function vec3(x, y, z) {
    return new CSG.Vector3D(x, y, z);
}
function poly() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var _a;
    return new ((_a = CSG.Polygon).bind.apply(_a, [void 0].concat(args)))();
}
function vtx(v) {
    return new CSG.Vertex(v);
}
//
//
//
var Tri = /** @class */ (function () {
    function Tri() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this.pts = args;
    }
    Tri.prototype.toPoly = function () {
        return poly(this.pts.map(function (pt) { return vtx(pt); }));
    };
    return Tri;
}());
function tri() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    return new (Tri.bind.apply(Tri, [void 0].concat(args)))();
}
var Sphere = /** @class */ (function () {
    function Sphere() {
        this.tris = [];
        var p1 = vec3(1, 1, 1);
        var p2 = vec3(1, -1, -1);
        var p3 = vec3(-1, 1, -1);
        var p4 = vec3(-1, -1, 1);
        this.tris.push(tri(p1, p2, p3));
        this.tris.push(tri(p2, p1, p4));
        this.tris.push(tri(p3, p4, p1));
        this.tris.push(tri(p4, p3, p2));
    }
    Sphere.prototype.toCSG = function () {
        log('toCSG()');
        var polys = this.tris.map(function (t) { return t.toPoly(); });
        return CSG.fromPolygons(polys);
    };
    return Sphere;
}());
exports.components = { sphere: new Sphere().toCSG() };
