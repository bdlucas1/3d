const {ui, lib, CSG} = require('../../designer/designer.js')

wedges = ui.slider({name: 'wedges', min: 3, max: 100, value: 20})
slices = ui.slider({name: 'slices', min: 1, max: 100, value: 20})

options = {wedges, slices}

exports.components = {
    cone: lib.cone(options),
    rod: lib.rod(options)
}
