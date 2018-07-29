import * as assert from 'assert'
import {log, CSG, ui} from '../../designer/designer'
import {Vec3, vec3, eq, Vtx, vtx, Poly, poly} from '../../designer/lib'

let nextVecName = 0;
const vecNames: {[s: string]: string} = {}

function prt(v: Vec3) {
    const s = '(' + v.x + ',' + v.y + ',' + v.z + ')'
    if (s in vecNames) {
        return vecNames[s]
    } else {
        const p = 'p' + (nextVecName++)
        log(p, '=', s)
        vecNames[s] = p
        return p
    }
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
    
    minAngle(): number {
        const a01 = this.p1.minus(this.p0).unit().dot(this.p2.minus(this.p0).unit())
        const a12 = this.p2.minus(this.p1).unit().dot(this.p0.minus(this.p1).unit())
        const a20 = this.p0.minus(this.p2).unit().dot(this.p1.minus(this.p2).unit())
        return Math.min(1-a01, 1-a12, 1-a20)
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

//p588 0.2979837458563449  0.9084845686620523 0.29798374585634485
//u588 0.29754773579168553 0.9071552732859368 0.2975477357916855   < p588

//p592 0.30427712027893367 0.9026798259347101 0.30427712027893367
//u592 0.3042771202789337  0.9026798259347102 0.3042771202789337    = p592

//p591 0.3009141247442587  0.904931698560059  0.30091412474425866
//u591 0.30091412474425877 0.9049316985600591 0.3009141247442587   = p591
//s591 0.30091412474425877 0.9049316985600591 0.3009141247442587   = p591

//p01  0.3011304330676393  0.9055821972983812 0.30113043306763926  mid(p588,p592)
//u01  0.3009141247442587  0.904931698560059  0.30091412474425866  = p591
//s01  0.3009141247442587  0.904931698560059  0.30091412474425866  = p591
/*
        const mid = (p: Vec3, q: Vec3) => p.plus(q).times(0.5)
        const p588 = vec3(0.2979837458563449,0.9084845686620523,0.29798374585634485)
        const p592 = vec3(0.30427712027893367,0.9026798259347101,0.30427712027893367)
        const p591 = vec3(0.3009141247442587,0.904931698560059,0.30091412474425866)
        const u588 = p588.unit()
        const u592 = p592.unit()
        const u591 = p591.unit()
        const p01 = mid(p588,p592)
        const u01 = p01.unit()
        const s01 = surface(p01)
        const s591 = surface(p591)
        log('p588', p588.x, p588.y, p588.z)
        log('p592', p592.x, p592.y, p592.z)
        log('p591', p591.x, p591.y, p591.z)
        log('u588', u588.x, u588.y, u588.z)
        log('u592', u592.x, u592.y, u592.z)
        log('u591', u591.x, u591.y, u591.z)
        log('s591', s591.x, s591.y, s591.z)
        log('p01', p01.x, p01.y, p01.z)
        log('u01', u01.x, u01.y, u01.z)
        log('s01', s01.x, s01.y, s01.z)
        throw 'xxx'
*/

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

        const split = (t: Tri, w: string) => {

            const minAngle = t.minAngle()
            if (t.minAngle() < 1e-4) {
                //log('skipping split', 'level', level, 'minAngle', minAngle)
                return
            }

            //log('  '.repeat(level), prt(t.p0), prt(t.p1), prt(t.p2), w, minAngle)

            const _level = level
            //if (level > 100)
            //    throw 'too deep'
//            if (level > 20) {
//                this.tris.push(t)
//                return
//            }

            level += 1
            _split(t)
            level -= 1
        }


        const _split = (t: Tri) => {

            const add3 = (p: Vec3, q: Vec3, r: Vec3, w: string) => split(tri(p, q, r), w)

            // p q
            // s r
            const add4 = (p: Vec3, q: Vec3, r: Vec3, s: Vec3, w: string) => {
                const c = p.plus(q).plus(r).plus(s).times(0.25)
                const cs = surface(c)
                if (c.minus(cs).length() > error) {
                    add3(p, q, cs, 'x')
                    add3(q, r, cs, 'x')
                    add3(r, s, cs, 'x')
                    add3(s, p, cs, 'x')
                }  else if (p.minus(r).length() < q.minus(s).length()) {
                    add3(p, r, s, w)
                    add3(r, p, q, w)
                } else {
                    add3(q, s, p, w)
                    add3(s, q, r, w)
                }
            }

            //        p0
            //
            //    p20     p01
            //
            //  p2    p12     p1
            const mid = (p: Vec3, q: Vec3) => {
                //const m = 0.5
                const m = 0.3 + Math.random() * 0.4
                return p.times(m).plus(q.times(1-m))
            }
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
                add3(t.p0, s01, s20, 'a')
                add3(t.p1, s12, s01, 'b')            
                add3(t.p2, s20, s12, 'c')
                add3(s01, s12, s20, 'd')
            } else if (bad01 && bad12) {
                add3(t.p1, s12, s01, 'e')
                add4(s01, s12, t.p2, t.p0, 'f')
            } else if (bad12 && bad20) {
                add3(t.p2, s20, s12, 'g')
                add4(s12, s20, t.p0, t.p1, 'h')
            } else if (bad20 && bad01) {
                add3(t.p0, s01, s20, 'i')
                add4(s20, s01, t.p1, t.p2, 'j')
            } else if (bad01) {
                add3(s01, t.p2, t.p0, 'k')
                add3(s01, t.p1, t.p2, 'l')
            } else if (bad12) {
                add3(s12, t.p0, t.p1, 'm')
                add3(s12, t.p2, t.p0, 'n')
            } else if (bad20) {
                add3(s20, t.p1, t.p2, 'o')
                add3(s20, t.p0, t.p1, 'p')
            } else {
                this.tris.push(t)
            }

        }

        const splitOnce = (t: Tri) => {
            const mid = (p: Vec3, q: Vec3) => p.plus(q).times(0.5)
            const p01 = mid(t.p0, t.p1)
            const p12 = mid(t.p1, t.p2)
            const p20 = mid(t.p2, t.p0)
            const s01 = surface(p01)
            const s12 = surface(p12)
            const s20 = surface(p20)
            this.tris.push(tri(t.p0, s01, s20))
            this.tris.push(tri(t.p1, s12, s01))
            this.tris.push(tri(t.p2, s20, s12))
            this.tris.push(tri(s01, s12, s20))
        }

        while (this.tris.length < detail*detail / 4) {
            const tris = this.tris
            this.tris = []
            tris.forEach(t => splitOnce(t))
        }

        let error = 1
        //let error = 0.001
        let trinum = 0
        while (this.tris.length < detail*detail) {
            log('xxx this.tris.length', this.tris.length)
            error /= 2
            log('xxx error', error)
            const tris = this.tris
            this.tris = []
            tris.forEach(t => {
                split(t, 'root')
                trinum++
            })
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
