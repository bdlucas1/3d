wedges = ui.slider({name: 'wedges', min: 3, max: 100, value: 20})
slices = ui.slider({name: 'slices', min: 1, max: 100, value: 20})

options = {wedges, slices}

return {
    cone: lib.cone(options),
    rod: lib.rod(options)
}
