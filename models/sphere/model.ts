import * as assert from 'assert'
import {log, CSG, ui} from '../../designer/designer'

interface Vec3 {
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

function vec3(x: number, y: number, z: number): Vec3 {
    return new CSG.Vector3D(x, y, z)
}

function eq(p: Vec3, q: Vec3) {
    return p.x==q.x && p.y==q.y && p.z==q.z
    //return p.minus(q).length() < 1e-10
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
        assert(!eq(p1, p2), 'p1==p2')
        assert(!eq(p2, p0), 'p2==p0')
        assert(!eq(p0, p1), 'p0==p1')
        this.p0 = p0
        this.p1 = p1
        this.p2 = p2
    }
    
    area(): number {
        return this.p1.minus(this.p0).cross(this.p2.minus(this.p0)).length()
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
        surface?: (p: Vec3) => Vec3
    }) {

        const detail = options.detail || 10
        const surface = options.surface || ((p) => p.unit())

        const p1 = surface(vec3(1, 1, 1))
        const p2 = surface(vec3(1, -1, -1))
        const p3 = surface(vec3(-1, 1, -1))
        const p4 = surface(vec3(-1, -1, 1))
        const t0 = tri(p1, p2, p3)
        const t1 = tri(p4, p3, p2)
        const t2 = tri(p3, p4, p1)
        const t3 = tri(p2, p1, p4)
        this.tris = [t0, t1, t2, t3]

        let level = 0

        const split = (t: Tri) => {

            const area = t.area()
            if (area < 1e-4) {
                //log('skipping split', 'level', level, 'area', area)
                return
            }

            const _level = level
            level += 1
            if (level > 100)
                throw 'too deep'

            try {
                _split(t)
            } catch (e) {
                //log('  '.repeat(_level), area, prt(t.p0), prt(t.p1), prt(t.p2))
                log('xxx exc', trinum, area, prt(t.p0), prt(t.p1), prt(t.p2))
                throw e
            }

            level -= 1

        }


        const _split = (t: Tri) => {

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
            const p01 = mid(t.p0, t.p1)
            const p12 = mid(t.p1, t.p2)
            const p20 = mid(t.p2, t.p0)
            const s01 = surface(p01)
            const s12 = surface(p12)
            const s20 = surface(p20)
            const bad01 = s01.minus(p01).length() > error
            const bad12 = s12.minus(p12).length() > error
            const bad20 = s20.minus(p20).length() > error
            if (bad01 && bad12 && bad20) {
                add3(t.p0, s01, s20)
                add3(t.p1, s12, s01)            
                add3(t.p2, s20, s12)
                add3(s01, s12, s20)
            } else if (bad01 && bad12) {
                add3(t.p1, s12, s01)
                add4(s01, s12, t.p2, t.p0)
            } else if (bad12 && bad20) {
                add3(t.p2, s20, s12)
                add4(s12, s20, t.p0, t.p1)
            } else if (bad20 && bad01) {
                add3(t.p0, s01, s20)
                add4(s20, s01, t.p1, t.p2)
            } else if (bad01) {
                add3(s01, t.p2, t.p0)
                add3(s01, t.p1, t.p2)
            } else if (bad12) {
                add3(s12, t.p0, t.p1)
                add3(s12, t.p2, t.p0)
            } else if (bad20) {
                add3(s20, t.p1, t.p2)
                add3(s20, t.p0, t.p1)
            } else {
                this.tris.push(t)
            }

        }

        //let error = 1
        let error = 0.001
        let trinum = 0
        while (this.tris.length < detail*detail) {
            error /= 2
            log('xxx error', error)
            const tris = this.tris
            this.tris = []
            tris.forEach(t => {
                split(t)
                trinum++
            })
            break
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
    //surface: (p: Vec3) => p.unit().times(1 + (p.unit().x + p.unit().y * 0.234) * 0.7 )
    surface: (p: Vec3) => {
        const u = p.unit()
        return Math.abs(u.x) < 0.3? u.times(1 - (u.x**2 - 0.09)) : u
    }
    
}

export const components = {sphere: new Sphere(options).toCSG()}
