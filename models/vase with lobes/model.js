detail = ui.slider({name: 'detail', min: 10, max: 50, value: 20})
thickness = ui.slider({name: 'thickness', min: 0.01, max: 0.1, step: 0.005, value: 0.02})

// const f = (s) => lib.wave(0.0, 0.9, 0.25, .4)(s) - 0.1 * s
diameter = ui.slider({name: 'diameter', min: 0.1, max: 2, step: 0.01, value: 1.0})
pts = [{x: 0, y: 0.4}, {x: 0.25, y: 0.523}, {x: 0.5, y: 0.396}, {x: 0.75, y: 0.191}, {x: 1, y: 0.212}]
profile = ui.curve({name: 'profile', kind: 'hybrid', value: pts, scale: diameter / 2})

const nLobes = ui.slider({name: 'n lobes', min: 1, max: 30, value: 15})
const lobeHeight = ui.slider({name: 'lobe height', min: 0, max: 0.1, step: 0.001, value: 0.025})
const lobeHorProfile = ui.curve({name: 'lobe h profile', kind: 'poly', value: [{x:0, y:0}, {x:0.5, y:1}, {x:1, y:0}]})
const lobeVerProfile = ui.curve({name: 'lobe v profile', kind: '1 wave', value: [{x:0, y:0}, {x:0.5, y:1}, {x:1, y:0}]})

ui.view({distance: 10, height: 2.5})

vase = lib.vase({
    slices: detail,
    wedges: Math.max(Math.ceil(detail / nLobes) * nLobes, Math.ceil(Math.sqrt(detail)) * nLobes),
    thickness: () => thickness,
    radius: (s, a) => profile(s) + lobeHorProfile(a * nLobes % 1) * lobeVerProfile(s) * lobeHeight,
    base: thickness
})

return {vase, outer: vase.outer, inner: vase.inner}

