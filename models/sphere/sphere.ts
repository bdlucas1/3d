    /*
    function constructor0() {

        const p1 = vec3(1, 1, 1).unit()
        const p2 = vec3(1, -1, -1).unit()
        const p3 = vec3(-1, 1, -1).unit()
        const p4 = vec3(-1, -1, 1).unit()
        const t0 = tri(p1, p2, p3)
        const t1 = tri(p4, p3, p2)
        const t2 = tri(p3, p4, p1)
        const t3 = tri(p2, p1, p4)

        const error = 0.12

        const split = (t: Tri) => {
            const mid = (p: Vec3, q: Vec3) => p.plus(q).times(0.5)
            let p01 = mid(t.p0, t.p1)
            let p12 = mid(t.p1, t.p2)
            let p20 = mid(t.p2, t.p0)
            const bad01 = 1 - p01.length() > error
            const bad12 = 1 - p12.length() > error
            const bad20 = 1 - p20.length() > error
            if (bad01 || bad12 || bad20) {
                if (bad01) p01 = p01.unit()
                if (bad12) p12 = p12.unit()
                if (bad20) p20 = p20.unit()
                const t0 = tri(t.p0, p01, p20)
                const t1 = tri(t.p1, p12, p01)            
                const t2 = tri(t.p2, p20, p12)
                const t012 = tri(p01, p12, p20)
                const handle = (bad: boolean, t: Tri) => bad? split(t) : this.tris.push(t)
                handle(bad01 && bad20, t0)
                handle(bad12 && bad01, t1)
                handle(bad20 && bad12, t2)
                handle(bad01 && bad12 && bad20, t012)
            } else {
                this.tris.push(t)
            }
        }

        [t0, t1, t2, t3].forEach(t => split(t))
        log('xxx tris.length', this.tris.length)
    }
    */
