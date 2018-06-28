return lib.vase({
    slices: 20,
    wedges: 20,
    thickness: () => 0.02,
    radius: (s) => lib.wave(0.0, 0.9, 0.25, .4)(s) - 0.1 * s,
    base: 0.1
})

