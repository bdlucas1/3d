detail = ui.slider({name: 'detail', min: 10, max: 50, value: 20})
thickness = ui.slider({name: 'thickness', min: 0.01, max: 0.1, step: 0.005, value: 0.02})

// const f = (s) => lib.wave(0.0, 0.9, 0.25, .4)(s) - 0.1 * s
diameter = ui.slider({name: 'diameter', min: 0.1, max: 2, step: 0.01, value: 1.05})
pts = [{x: 0, y: 0.4}, {x: 0.25, y: 0.523}, {x: 0.5, y: 0.396}, {x: 0.75, y: 0.191}, {x: 1, y: 0.212}]
profile = ui.curve({name: 'profile', kind: 'cubic', pts: pts, scale: diameter / 2})

ui.view({distance: 10, height: 2.5})


vase = lib.vase({
    slices: detail,
    wedges: detail,
    thickness: () => thickness,
    radius: profile,
})

return {vase, outer: vase.outer, inner: vase.inner}

