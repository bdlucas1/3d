detail = ui.slider({name: 'detail', min: 10, max: 50, value: 20})
thickness = ui.slider({name: 'thickness', min: 0.01, max: 0.1, step: 0.005, value: 0.02})

ui.view({distance: 10, height: 2.5})

vase = lib.vase({
    slices: detail,
    wedges: detail,
    thickness: () => thickness,
    radius: (s) => lib.wave(0.0, 0.9, 0.25, .4)(s) - 0.1 * s,
    base: thickness
})

return {vase, outer: vase.outer, inner: vase.inner}

