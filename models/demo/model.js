ui.view({distance: 5, height: 4})

var a = CSG.cube({radius: 1.1})
var b = CSG.sphere({radius: 1.35})
//var c = CSG.sphere({radius: 0.5})
var c = CSG.cylinder({radius: 0.5})
//a.setColor(1, 1, 0)
//b.setColor(0, 0.5, 1)
c.setColor(.7, 0, .8)
return {demo: a.subtract(b).union(c)}
