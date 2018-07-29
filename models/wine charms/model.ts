import {log, CSG, ui} from '../../designer/designer'
import {Vec3, vec3, shell, line, shoulders, circle} from '../../designer/lib'

const detail = ui.slider({name: 'detail', min: 20, max: 200, value: 50, immaterial: true})

//
// ring
//

const ringHole = ui.slider({name: 'ring hole', min: 1.0, max: 20.0, step: 0.1, value: 10})
const ringTube = ui.slider({name: 'ring tube', min: 1.0, max: 10.0, step: 0.1, value: 5})
const ringGap = ui.slider({name: 'ring gap', min: 0.0, max: 10, step: 0.1, value: 8})
const ringShoulder = ui.slider({name: 'ring shoulder', min: 0.0, max: 5, step: 0.1, value: 1})

const ringRadius = (ringTube + ringHole) / 2         // mid radius of torus
const ringCircumference = 2 * Math.PI * ringRadius   // mid circumference
const ringTubeRadius = ringTube / 2                  // radius of ring tube
const ringGapPortion = ringGap / ringCircumference
const ringShoulderPortion = ringShoulder / (ringCircumference - ringGap)

const ring = shell({
    detail,
    radius: shoulders(ringShoulderPortion, ringShoulderPortion, ringTubeRadius),
    path: circle(ringGapPortion / 2, 1 - ringGapPortion / 2, ringRadius)
}).translate(vec3(0, ringRadius - ringTubeRadius / 2, ringTubeRadius))

//
// disk
//

const diskHeight = ui.slider({name: 'disk height', min: 1.0, max: 10.0, step: 0.1, value: 5})
const diskDiameter = ui.slider({name: 'disk diameter', min: 1.0, max: 40.0, step: 0.1, value: 20})

const disk = shell({
    detail,
    radius: shoulders(0.1, 0.1, diskDiameter / 2),
    path: line(vec3(0,0,0), vec3(0,0,diskHeight)),
}).translate(vec3(0, - diskDiameter / 2 + ringTubeRadius / 2, 0))

//
//
//

const size = ringHole + 2 * ringTube
ui.view({distance: 10 * size, height: 2 * size, center: vec3(0, 0, 0)})

export const components = {charm: ring.union(disk), ring, disk}

