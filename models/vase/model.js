slices = ui.slider({name: 'slices', min: 10, max: 50, value: 20})
wedges = ui.slider({name: 'wedges', min: 4, max: 50, value: 20})

ui.view({distance: 10, height: 2.5})

return lib.vase({
    slices,
    wedges,
    thickness: () => 0.02,
    radius: (s) => lib.wave(0.0, 0.9, 0.25, .4)(s) - 0.1 * s,
    base: 0.1
})

