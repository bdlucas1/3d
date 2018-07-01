const detail = ui.slider({name: 'detail', min: 12, max: 50, value: 40})
const thickness = ui.slider({name: 'thickness', min: 0.01, max: 0.1, step: 0.005, value: 0.02})

const nh = ui.slider({name: 'n horizontal', min: 1, max: 20, value: 7})
const nv = ui.slider({name: 'n vertical', min: 1, max: 20, value: 9})
const hskew = ui.slider({name: 'h skew', min: -0.5, max: 0.5, step: 0.01, value: 0.1})
const vmin = ui.slider({name: 'v min', min: -1.0, max: 1.0, step: 0.01, value: -0.65})
const vmax = ui.slider({name: 'v max', min: -1.0, max: 1.0, step: 0.01, value: 0.55})
const diameter = ui.slider({name: 'diameter', min: 0, max: 0.5, step: 0.01, value: 0.2})

const radius = (s) => lib.wave(0.0, 0.9, 0.25, .4)(s) - 0.1 * s
let maxr = 0
for (var s = 0; s <= 1; s += 0.01)
    if (radius(s) > maxr)
        maxr = radius(s)
log('maxr', maxr)
maxr *= 1.1

ui.view({distance: 10, height: 2.5})

punch = lib.empty()

for (var h = 0; h < nh; h++) {
    for (var v = 0; v < nv; v++) {
        var a = (h + v*hskew) / nh * 2 * Math.PI
        var x = Math.sin(a) * maxr
        var z = Math.cos(a) * maxr
        var y = vmin + (vmax-vmin) * (v / (nv-1))
        cone = lib.cone({
            base: [x, y, z],
            tip: [0.0*x, y, 0.0*z],
            radius: diameter / 2 * maxr,
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
    radius: radius,
    base: thickness
})

vase_with_holes = vase.subtract(punch)
holes = vase.intersect(punch)

return {
    'vase with holes': vase_with_holes,
    holes,
    punch,
    vase,
    outer: vase.outer,
    inner: vase.inner
}

