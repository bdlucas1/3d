"use strict";
exports.__esModule = true;
var $ = require("jquery");
var fs = require("fs");
var path = require("path");
var electron_1 = require("electron");
var log = electron_1.remote.getGlobal('console').log;
var editorElt = function () { return $('#editor')[0]; };
var viewerElt = function () { return $('#viewer')[0]; };
var errorElt = function () { return $('#error')[0]; };
var viewer;
var keyTimeout = null;
var modelFn = '../models/demo/model.js';
// read the file
var read = function () {
    try {
        var newValue = fs.readFileSync(modelFn).toString();
        if (newValue != editorElt().value) {
            editorElt().value = newValue;
            return true;
        }
    }
    catch (e) {
        log(e);
    }
    return false;
};
// compute size, create viewer
function size() {
    $(viewerElt()).empty();
    var size = viewerElt().getBoundingClientRect();
    log('size', size.width, size.height);
    viewer = new Viewer(new CSG(), size.width, size.height, 5);
    $(viewerElt()).append(viewer.gl.canvas);
}
// compile program
function build(save) {
    log('building');
    try {
        var model = new Function(editorElt().value)();
        errorElt().innerHTML = '';
        viewer.mesh = model.toMesh();
        viewer.gl.ondraw();
        if (save) {
            log('saving');
            fs.writeFileSync(modelFn, editorElt().value);
        }
    }
    catch (e) {
        errorElt().innerText = 'Error: ' + e.toString();
    }
}
$(window).on('error', function (error) {
    var e = error.originalEvent;
    log('error', e.message, e.filename, e.lineno);
});
$(window).on('resize', function () {
    size();
    build(false);
});
$(window).on('load', function () {
    // render
    size();
    read();
    build(false);
    // respond to edits
    $(editorElt()).on('input', function () {
        log('key change');
        if (keyTimeout)
            clearTimeout(keyTimeout);
        keyTimeout = setTimeout(function () { return build(true); }, 250);
    });
    // respond to file changes
    fs.watch(path.dirname(modelFn), function (what, fn) {
        log('file change', what, fn, path.basename(modelFn));
        if (fn == path.basename(modelFn) && read())
            build(false);
    });
});
