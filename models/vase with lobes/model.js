const {log, ui, lib} = require('../../designer/designer.js')

const detail = ui.slider({name: 'detail', min: 10, max: 200, value: 75, immaterial: true})
const thickness = ui.slider({name: 'thickness', min: 0.01, max: 0.05, step: 0.005, value: 0.02})

// const f = (s) => lib.wave(0.0, 0.9, 0.25, .4)(s) - 0.1 * s
const diameter = ui.slider({name: 'diameter', min: 0.05, max: 1.5, step: 0.01, value: 0.6})
const pts = [{x: 0, y: 1}]
const profile = ui.curve({name: 'profile', kind: 'poly', pts: pts})

const nLobes = ui.slider({name: 'n lobes', min: 1, max: 64, value: 1})
const lobeHeight = ui.slider({name: 'lobe height', min: 0, max: 0.1, step: 0.001, value: 0.1})
const lobeHorProfile = ui.curve({name: 'lobe h profile', kind: 'poly', pts: [{x:0, y:1}]})
const lobeVerProfile = ui.curve({name: 'lobe v profile', kind: '1 wave', pts: [{x:0, y:0}, {x:0.5, y:1}, {x:1, y:0}]})
const lobeProfile = (s, a) => lobeHorProfile(a * nLobes % 1) * lobeVerProfile(s)

const twist = ui.slider({name: 'twist', min: -2, max: 2, step: 0.01, value: -0.5})
const interior = ui.slider({name: 'interior lobes', min: 0, max: 1, step: 0.01, value: 1})

const path = lib.line(lib.vec3(0, 0, 0), lib.vec3(0, 0, 1))
const height = path(1).minus(path(0)).length()
const center = path(1).plus(path(0)).times(0.5)
ui.view({distance: 10, height: height * 1.25, center})

const vase = lib.vase({
    detail,
    thickness: (s, a) => thickness + lobeProfile(s, a) * lobeHeight * (1 - interior),
    radius: (s, a) => profile(s) * (diameter/2 - lobeHeight) + lobeProfile(s, a) * lobeHeight,
    twist,
    path
})

exports.components = {vase: vase}

