"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var $ = require("jquery");
var fs = require("fs");
var path = require("path");
var ui = require("./ui");
var commandLineArgs = require("command-line-args");
var electron_1 = require("electron");
var log = electron_1.remote.getGlobal('console').log;
var CSG = require('@jscad/CSG').CSG;
var Viewer = require('@jscad/openjscad/src/ui/viewer/jscad-viewer');
function now() {
    return new Date().getTime();
}
function message(msg) {
    $('#message')[0].innerText = msg;
}
var Model = /** @class */ (function () {
    function Model(name) {
        var _this = this;
        this.name = 'N/A';
        this.stats = "N/A";
        this.settings = new ui.Settings();
        this.variantsFn = 'N/A';
        this.variants = {};
        this.currentVariant = 'N/A';
        this.modelFn = 'N/A';
        this.fileChanged = true;
        this.code = "N/A";
        this.components = null;
        this.currentComponent = 'N/A';
        log('adding model', name);
        this.name = name;
        this.modelFn = path.join('../models', name, 'model.js');
        this.variantsFn = path.join('../models', name, 'variants.json');
        Model.models[name] = this;
        // watch for changes
        fs.watch(path.dirname(this.modelFn), function (what, fn) {
            if (fn == path.basename(_this.modelFn)) {
                log('file change', what, fn);
                if (_this == Model.current)
                    _this.read();
                else
                    _this.fileChanged = true;
            }
        });
        // xxx watch for changes on variantsFn?
    }
    // make this model the active one
    Model.prototype.activate = function () {
        log('activating', this.name);
        Model.current = this;
        // read if needed, else just show
        if (!this.components || this.fileChanged) {
            this.read();
        }
        else {
            this.settings.activate();
            this.show();
            message(this.stats);
        }
    };
    // read the file
    Model.prototype.read = function () {
        try {
            // read model file
            log('reading', this.modelFn);
            this.fileChanged = false;
            var newValue = fs.readFileSync(this.modelFn).toString();
            if (newValue != this.code) {
                this.code = newValue;
                $('#component-selector').empty();
                this.settings.clear();
                this.construct();
            }
            // read variants file
            log('reading', this.variantsFn);
            this.variants = {};
            this.variants['default'] = {};
            var variants = JSON.parse(fs.readFileSync(this.variantsFn).toString());
            for (var name_1 in variants)
                this.variants[name_1] = variants[name_1];
        }
        catch (e) {
            log(e);
        }
    };
    // execute file, constructing model using csg
    Model.prototype.construct = function () {
        var _this = this;
        log('constructing');
        message('constructing...');
        var start = now();
        // defer so we will see the "constructing..." message
        setTimeout(function () {
            try {
                // execute the code
                var libNames = ['ui', 'lib'];
                var loadedLibs = libNames.map(function (name) { return require('./' + name + '.js'); });
                _this.settings.activate(); // assert already active?
                _this.components = new (Function.bind.apply(Function, [void 0, 'log', 'CSG'].concat(libNames, [_this.code])))().apply(void 0, [log, CSG].concat(loadedLibs));
                // remember default settings
                _this.variants['default'] = _this.settings.defaultVariant;
                // message number of polys in each compoment, and construction time
                _this.stats = Object.keys(_this.components).map(function (name) {
                    var polys = _this.components[name].polygons;
                    return name + ': ' + (polys ? polys.length : 'none');
                }).join(', ');
                message(_this.stats + ';    ' + (now() - start) + 'ms');
                // show our components, variants, ui, and model
                _this.show();
                // now's a good time to schedule a gc
                setTimeout(function () { return global.gc(true); }, 0);
            }
            catch (e) {
                log(e.stack);
                message(e.toString());
            }
        }, 0); // setTimeout
    };
    // show our components and ui
    Model.prototype.show = function () {
        log('showing', this.name);
        // show ui
        this.settings.activate();
        // populate #variant-selctor, choosing initial variant
        var initialVariant = null;
        $('#variant-selector').empty();
        for (var variant in this.variants) {
            if (!initialVariant || variant == this.currentVariant)
                initialVariant = variant;
            $('<option>')
                .attr('value', variant)
                .text(variant)
                .appendTo('#variant-selector');
        }
        if (initialVariant)
            $('#variant-selector').val(initialVariant);
        // populate #component-selector, choose initialComponent
        var initialComponent = null;
        $('#component-selector').empty();
        for (var component in this.components) {
            if (!initialComponent || component == this.currentComponent)
                initialComponent = component;
            $('<option>')
                .attr('value', component)
                .text(component)
                .appendTo('#component-selector');
        }
        // set up Viewer viewport
        var viewOptions = this.settings.viewOptions;
        var angle = Math.atan(viewOptions.height / 2 / viewOptions.distance) / Math.PI * 360;
        Model.viewer.setCameraOptions({
            fov: angle,
            angle: { x: -60, y: 0, z: 0 },
            position: { x: 0, y: 0, z: viewOptions.distance }
        });
        Model.viewer.resetCamera();
        Model.viewer.handleResize();
        // select initial component, trigger change, which causes it to be rendered via setComponent
        if (initialComponent)
            $('#component-selector').val(initialComponent).trigger('change');
    };
    Model.prototype.setVariant = function (name) {
        log('setVariant', this.name, name);
        this.currentVariant = name;
        this.settings.setVariant(this.variants[name]);
        this.construct();
    };
    Model.prototype.setComponent = function (name) {
        log('setComponent', this.name, name);
        this.currentComponent = name;
        Model.viewer.setCsg(this.components[name].rotateX(90));
    };
    Model.current = null;
    Model.models = {};
    return Model;
}());
// ui calls this to indicate change in parameters
function change() {
    if (Model.current)
        Model.current.construct();
}
exports.change = change;
$(window).on('load', function () {
    // select model
    log('argv', electron_1.remote.process.argv);
    var optionDefinitions = [
        { name: 'model', alias: 'm', type: String }
    ];
    // ignore electron flags
    var argv = electron_1.remote.process.argv.slice(1);
    while (argv[0].startsWith('-'))
        argv = argv.slice(1);
    var options = commandLineArgs(optionDefinitions, { argv: argv.slice(1) });
    log(options);
    // read model directory, populate menu
    log('reading models');
    var newestMtime = 0;
    var newestModel;
    var dn = '../models';
    fs.readdirSync(dn).forEach(function (fn) {
        $('<option>')
            .attr('value', fn)
            .text(fn)
            .appendTo('#model-selector');
        new Model(fn);
        var mtime = fs.statSync(path.join(dn, fn)).mtimeMs;
        if (mtime > newestMtime) {
            newestMtime = mtime;
            newestModel = fn;
        }
    });
    options.model = options.model || newestModel;
    // add viewer
    // work around bug: Viewer constructor doesn't apply background from options
    var viewerDefaults = Viewer.defaults();
    viewerDefaults.background.color = { r: 1.0, g: 1.0, b: 1.0, a: 0.0 };
    Viewer.defaults = function () { return viewerDefaults; };
    Model.viewer = new Viewer($('#viewer')[0], {
        plate: {
            draw: false,
        },
        solid: {
            lines: true,
            overlay: false,
            smooth: false,
            faceColor: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 }
        },
    });
    // respond to model selector changes
    $('#model-selector').on('change', function () {
        var name = $('#model-selector')[0].value;
        Model.models[name].activate();
    });
    // respond to variant selector changes
    $('#variant-selector').on('change', function () {
        var variantName = $('#variant-selector')[0].value;
        if (Model.current)
            Model.current.setVariant(variantName);
    });
    // respond to component selector changes
    $('#component-selector').on('change', function () {
        var componentName = $('#component-selector')[0].value;
        if (Model.current)
            Model.current.setComponent(componentName);
    });
    // load initial model by triggering change which calls activate() on the model
    log('loading initial model');
    $('#model-selector').val(options.model).trigger('change');
});
$(window).on('error', function (error) {
    var e = error.originalEvent;
    log('error', e.message, e.filename, e.lineno);
});
