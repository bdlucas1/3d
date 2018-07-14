detail = ui.slider({name: 'detail', min: 10, max: 200, value: 75, immaterial: true})
thickness = ui.slider({name: 'thickness', min: 0.01, max: 0.1, step: 0.005, value: 0.03})

// const f = (s) => lib.wave(0.0, 0.9, 0.25, .4)(s) - 0.1 * s
diameter = ui.slider({name: 'diameter', min: 0.1, max: 2, step: 0.01, value: 1.3})
pts = [{x: 0, y: 0.4}, {x: 0.25, y: 0.523}, {x: 0.5, y: 0.396}, {x: 0.75, y: 0.191}, {x: 1, y: 0.212}]
profile = ui.curve({name: 'profile', kind: 'cubic', pts: pts})

nLobes = ui.slider({name: 'n lobes', min: 1, max: 64, value: 3})
lobeHeight = ui.slider({name: 'lobe height', min: 0, max: 0.2, step: 0.001, value: 0.150})
lobeHorProfile = ui.curve({name: 'lobe h profile', kind: 'poly', pts: [{x:0, y:0}, {x:0.5, y:1}, {x:1, y:0}]})
lobeVerProfile = ui.curve({name: 'lobe v profile', kind: '1 wave', pts: [{x:0, y:0}, {x:0.5, y:1}, {x:1, y:0}]})
lobeProfile = (s, a) => lobeHorProfile(a * nLobes % 1) * lobeVerProfile(s)

twist = ui.slider({name: 'twist', min: -2, max: 2, step: 0.01, value: -0.5})
interior = ui.slider({name: 'interior lobes', min: 0, max: 1, step: 0.01, value: 1})

height = 2 // using default path for lib.vase
ui.view({distance: 10, height: height * 1.25})

vase = lib.vase({
    slices: detail,
    wedges: Math.max(Math.ceil(detail / nLobes) * nLobes, Math.ceil(Math.sqrt(detail)) * nLobes),
    thickness: (s, a) => thickness + lobeProfile(s, a) * lobeHeight * (1 - interior),
    radius: (s, a) => profile(s) * (diameter/2 - lobeHeight) + lobeProfile(s, a) * lobeHeight,
    twist
})

return {vase}

