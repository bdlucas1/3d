const {ui, CSG} = require('../../designer/designer.js')

curve = ui.curve({name: 'curve', kind: 'cubic', pts: [{x: 0, y: 0}, {x: 0.5, y: 1}, {x: 1, y: 0}]})

exports.components = {curve: new CSG()}
