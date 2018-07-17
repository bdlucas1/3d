//const log = require('../../designer/designer.js').log
const CSG = require('@jscad/csg').CSG
const log = require('./designer.js').log

interface Vec3 {
    x: number
    y: number
    z: number
}

function vec3(x: number, y: number, z: number): Vec3 {
    return new CSG.Vector3D(x, y, z)
}

interface Poly {
}

function poly(...args: Vtx[]): Poly {
    return new CSG.Polygon(...args)
}

interface Vtx {
}

function vtx(v: Vec3): Vtx {
    return new CSG.Vertex(v)
}

//
//
//

class Tri {

    pts: Vec3[]

    constructor(...args: Vec3[]) {
        this.pts = args
    }
    
    toPoly(): Poly {
        return poly(this.pts.map(pt => vtx(pt)))
    }
}

function tri(...args: Vec3[]) {
    return new Tri(...args)
}

class Sphere {

    tris: Tri[] = []

    constructor() {
        const p1 = vec3(1, 1, 1)
        const p2 = vec3(1, -1, -1)
        const p3 = vec3(-1, 1, -1)
        const p4 = vec3(-1, -1, 1)
        this.tris.push(tri(p1, p2, p3))
        this.tris.push(tri(p2, p1, p4))
        this.tris.push(tri(p3, p4, p1))
        this.tris.push(tri(p4, p3, p2))
    }

    toCSG() {
        log('toCSG()')
        const polys = this.tris.map(t => t.toPoly())
        return CSG.fromPolygons(polys)
    }
}

export const components = {sphere: new Sphere().toCSG()}
