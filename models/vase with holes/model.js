const {log, ui, lib, CSG} = require('../../designer/designer.js')

const detail = ui.slider({name: 'detail', min: 12, max: 50, value: 20})
const thickness = ui.slider({name: 'thickness', min: 0.01, max: 0.1, step: 0.005, value: 0.02})

// const f = (s) => lib.wave(0.0, 0.9, 0.25, .4)(s) - 0.1 * s
const diameter = ui.slider({name: 'vase diameter', min: 0.1, max: 2, step: 0.01, value: 1.05})
const pts = [{x: 0, y: 0.4}, {x: 0.25, y: 0.523}, {x: 0.5, y: 0.396}, {x: 0.75, y: 0.191}, {x: 1, y: 0.212}]
const profile = ui.curve({name: 'profile', kind: 'cubic', pts: pts, scale: diameter / 2})

const nh = ui.slider({name: 'n horizontal', min: 1, max: 20, value: 7})
const nv = ui.slider({name: 'n vertical', min: 1, max: 20, value: 9})
const hskew = ui.slider({name: 'h skew', min: -0.5, max: 0.5, step: 0.01, value: 0.1})
const vmin = ui.slider({name: 'v min', min: -1.0, max: 1.0, step: 0.01, value: -0.65})
const vmax = ui.slider({name: 'v max', min: -1.0, max: 1.0, step: 0.01, value: 0.55})
const hole = ui.slider({name: 'hole diameter', min: 0, max: 0.5, step: 0.01, value: 0.2})

const path = lib.line(lib.vec3(0, 0, 0), lib.vec3(0, 0, 1))
const height = path(1).minus(path(0)).length()
const center = path(1).plus(path(0)).times(0.5)
ui.view({distance: 10, height: 2.5, center})

punch = lib.empty()

let maxr = 0
for (var s = 0; s <= 1; s += 0.01)
    if (profile(s) > maxr)
        maxr = profile(s)
log('maxr', maxr)
maxr *= 1.1

for (var h = 0; h < nh; h++) {
    for (var v = 0; v < nv; v++) {
        var a = (h + v*hskew) / nh * 2 * Math.PI
        var x = Math.sin(a) * maxr
        var z = Math.cos(a) * maxr
        var y = vmin + (vmax-vmin) * (v / (nv-1))
        cone = lib.cone({
            base: [x, y, z],
            tip: [0.0*x, y, 0.0*z],
            radius: hole / 2 * maxr,
            slices: 1,
            wedges: detail / 3
        })
        punch = punch.union(cone)
    }
}

vase = lib.vase({
    slices: detail,
    wedges: detail,
    thickness: () => thickness,
    radius: profile,
})

vase_with_holes = vase.subtract(punch)
holes = vase.intersect(punch)

exports.components = {
    'vase with holes': vase_with_holes,
    holes,
    punch,
    vase,
}

