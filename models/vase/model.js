detail = ui.slider({name: 'detail', min: 10, max: 50, value: 20})

ui.view({distance: 10, height: 2.5})

vase = lib.vase({
    slices: detail,
    wedges: detail,
    thickness: () => 0.02,
    radius: (s) => lib.wave(0.0, 0.9, 0.25, .4)(s) - 0.1 * s,
    base: 0.1
})

return {vase, outer: vase.outer, inner: vase.inner}

