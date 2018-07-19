import {log, CSG, ui} from '../../designer/designer'

interface Vec3 {
    x: number
    y: number
    z: number
    plus(q: Vec3): Vec3
    minus(q: Vec3): Vec3
    times(m: number): Vec3
    unit(): Vec3
    length(): number
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

function prt(v: Vec3) {
    return '(' + v.x + ',' + v.y + ',' + v.z + ')'
}

//
//
//

class Tri {

    p0: Vec3
    p1: Vec3
    p2: Vec3

    constructor(p0: Vec3, p1: Vec3, p2: Vec3) {
        this.p0 = p0
        this.p1 = p1
        this.p2 = p2
    }
    
    toPoly(): Poly {
        return poly([vtx(this.p0), vtx(this.p1), vtx(this.p2)])
    }
}

function tri(p0: Vec3, p1: Vec3, p2: Vec3) {
    return new Tri(p0, p1, p2)
}

class Sphere {

    tris: Tri[] = []

    constructor(options: {
        detail?: number,
        radius?: (p: Vec3) => number
    }) {

        const detail = options.detail || 10
        const radius = options.radius || (() => 1)

        const p1 = vec3(1, 1, 1).unit()
        const p2 = vec3(1, -1, -1).unit()
        const p3 = vec3(-1, 1, -1).unit()
        const p4 = vec3(-1, -1, 1).unit()
        const t0 = tri(p1, p2, p3)
        const t1 = tri(p4, p3, p2)
        const t2 = tri(p3, p4, p1)
        const t3 = tri(p2, p1, p4)
        this.tris = [t0, t1, t2, t3]

        const split = (t: Tri) => {

            const add3 = (p: Vec3, q: Vec3, r: Vec3) => split(tri(p, q, r))

            // p q
            // s r
            const add4 = (p: Vec3, q: Vec3, r: Vec3, s: Vec3) => {
                if (p.minus(r).length() < q.minus(s).length()) {
                    add3(p, r, s)
                    add3(r, p, q)
                } else {
                    add3(q, s, p)
                    add3(s, q, r)
                }
            }

            //        p0
            //
            //    p20     p01
            //
            //  p2    p12     p1
            const mid = (p: Vec3, q: Vec3) => p.plus(q).times(0.5)
            let p01 = mid(t.p0, t.p1)
            let p12 = mid(t.p1, t.p2)
            let p20 = mid(t.p2, t.p0)
            const r01 = radius(p01)
            const r12 = radius(p12)
            const r20 = radius(p20)
            const l01 = p01.length()
            const l12 = p12.length()
            const l20 = p20.length()
            const bad01 = Math.abs(r01 - l01) > error
            const bad12 = Math.abs(r12 - l12) > error
            const bad20 = Math.abs(r20 - l20) > error
            p01 = p01.times(r01 / l01)
            p12 = p12.times(r12 / l12)
            p20 = p20.times(r20 / l20)
            if (bad01 && bad12 && bad20) {
                add3(t.p0, p01, p20)
                add3(t.p1, p12, p01)            
                add3(t.p2, p20, p12)
                add3(p01, p12, p20)
            } else if (bad01 && bad20) {
                //add3(t.p0, p01, p20)
                add4(p20, p01, t.p1, t.p2)
            } else if (bad12 && bad01) {
                add3(t.p1, p12, p01)
                add4(p01, p12, t.p2, t.p0)
            } else if (bad20 && bad12) {
                add3(t.p2, p20, p12)
                add4(p12, p20, t.p0, t.p1)
            } else if (bad01) {
                add3(p01, t.p2, t.p0)
                add3(p01, t.p1, t.p2)
            } else if (bad12) {
                add3(p12, t.p0, t.p1)
                add3(p12, t.p2, t.p0)
            } else if (bad20) {
                add3(p20, t.p1, t.p2)
                add3(p20, t.p0, t.p1)
            } else {
                this.tris.push(t)
            }
        }

        let error = 1
        while (this.tris.length < detail*detail) {
            error /= 2
            const tris = this.tris
            this.tris = []
            tris.forEach(t => split(t))
        }
    }

    toCSG() {
        log('toCSG()')
        const polys = this.tris.map(t => t.toPoly())
        return CSG.fromPolygons(polys)
    }
}

const detail = ui.slider({name: 'detail', min: 1, max: 200, value: 10, immaterial: true})

const options = {
    detail,
    radius: (p: Vec3) => 1 + Math.abs(p.unit().x) / 10
}

export const components = {sphere: new Sphere(options).toCSG()}
