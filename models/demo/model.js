const {ui, lib, CSG} = require('../../designer/designer.js')

ui.view({distance: 5, height: 4.5, center: lib.vec3(0, 0, 0)})

const cube = CSG.cube({radius: 1.1})
const sphere = CSG.sphere({radius: 1.35})
const cylinder = CSG.cylinder({radius: 0.5})
cylinder.setColor(.7, 0, .8);

exports.components = {
    demo: cube.subtract(sphere).union(cylinder),
    cube,
    sphere,
    cylinder
}
