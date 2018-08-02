import {log, CSG, ui} from '../../designer/designer'
import {vec3, shell, rod, line, shoulders, circle, combine, place} from '../../designer/lib'

const detail = ui.slider({name: 'detail', min: 20, max: 200, value: 50, immaterial: true})

//
// ring
//

const ringHole = ui.slider({name: 'ring hole', min: 1.0, max: 20.0, step: 0.5, value: 10})
const ringTube = ui.slider({name: 'ring tube', min: 1.0, max: 10.0, step: 0.5, value: 3})
const ringGap = ui.slider({name: 'ring gap', min: 0.0, max: 10, step: 0.5, value: 7})
const ringShoulder = ui.slider({name: 'ring shoulder', min: 0.0, max: 5, step: 0.1, value: 1})

const ringRadius = (ringTube + ringHole) / 2         // mid radius of torus
const ringCircumference = 2 * Math.PI * ringRadius   // mid circumference
const ringTubeRadius = ringTube / 2                  // radius of ring tube
const ringGapPortion = ringGap / ringCircumference
const ringShoulderPortion = ringShoulder / (ringCircumference - ringGap)

const ring = shell({
    detail,
    radius: shoulders(ringShoulderPortion, ringShoulderPortion, ringTubeRadius, 0),
    path: circle(ringGapPortion / 2, 1 - ringGapPortion / 2, ringRadius)
}).translate(vec3(0, ringRadius - ringTubeRadius / 2, ringTubeRadius))

//
// disk
//

const showDisk = ui.checkbox({name: 'show disk', value: true})
const diskHeight = ui.slider({name: 'disk height', min: 1.0, max: 10.0, step: 0.5, value: 3})
const diskDiameter = ui.slider({name: 'disk diameter', min: 1.0, max: 40.0, step: 0.5, value: 20})
const diskY = - diskDiameter / 2 + ringTubeRadius / 2
const diskShoulder = 1

const diskRadius = diskDiameter / 2
const diskShoulderPortion = diskShoulder / diskHeight

const disk = rod({
    detail,
    radius: shoulders(diskShoulderPortion, diskShoulderPortion, diskRadius, diskRadius - diskShoulder),
    path: line(vec3(0,0,0), vec3(0,0,diskHeight)),
}).translate(vec3(0, diskY, 0))

//
// figure
//

const figureGrounded = ui.checkbox({name: 'figure grounded', value: false})
const figureSize = ui.slider({name: 'figure size', min: 0.5, max: 40, step: 0.5, value: 15})
const figureXoff = ui.slider({name: 'figure x off', min: -10, max: 10, step: 0.5, value: 0})
const figureYoff = ui.slider({name: 'figure y off', min: -10, max: 10, step: 0.5, value: 0})
const figureZoff = ui.slider({name: 'figure z off', min: -2, max: 2, step: 0.1, value: 0})
const figureXrot = ui.slider({name: 'figure x rot', min: -180, max: 180, step: 5, value: 0})
const figureYrot = ui.slider({name: 'figure y rot', min: -180, max: 180, step: 5, value: 0})
const figureZrot = ui.slider({name: 'figure z rot', min: -180, max: 180, step: 5, value: 0})
const figureY = figureYoff + (figureGrounded? - figureSize / 2 + ringTubeRadius / 2 : diskY)
const figureZ = figureZoff + (figureGrounded? 0 : diskHeight)

let figure = ui.load({name: 'figure file', value: 'none'})
figure = figure.rotateX(figureXrot).rotateY(figureYrot).rotateZ(figureZrot)
figure = place(figure)
figure = figure
    .scale(vec3(figureSize, figureSize, figureSize))
    .translate(vec3(figureXoff, figureY, figureZ))

//
// put it together
//

const size = ringHole + 2 * ringTube
ui.view({distance: 10 * size, height: 2 * size, center: vec3(0, 0, 0)})

const charm = showDisk? combine(ring, disk, figure) : combine(ring, figure)
export const components = showDisk? {charm, ring, disk, figure} : {charm, ring, figure}
