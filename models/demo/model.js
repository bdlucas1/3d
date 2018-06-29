ui.view({distance: 5, height: 4.5})

cube = CSG.cube({radius: 1.1})
sphere = CSG.sphere({radius: 1.35})
cylinder = CSG.cylinder({radius: 0.5})
cylinder.setColor(.7, 0, .8)

return {
    demo: cube.subtract(sphere).union(cylinder),
    cube,
    sphere,
    cylinder
}
