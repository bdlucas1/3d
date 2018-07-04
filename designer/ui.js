"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var $ = require("jquery");
var electron_1 = require("electron");
var designer = require("../designer/designer");
var numeric = require('numeric');
var log = electron_1.remote.getGlobal('console').log;
var Settings = /** @class */ (function () {
    function Settings() {
        this.viewOptions = Settings.defaultViewOptions;
        this.defaultVariant = {};
        this.settings = {};
    }
    Settings.prototype.activate = function () {
        Settings.current = this;
        $('#ui').empty();
        for (var name_1 in this.settings) {
            var setting = this.settings[name_1];
            var tr = $('<tr>').appendTo('#ui');
            $('<td>').appendTo(tr).addClass('ui-name').append($('<span>').text(name_1));
            $('<td>').appendTo(tr).addClass('ui-setting').append(setting.elt);
            setting.activate();
        }
    };
    Settings.prototype.clear = function () {
        this.settings = {};
        this.defaultVariant = {};
    };
    Settings.prototype.setVariant = function (variant) {
        for (var name_2 in variant)
            this.settings[name_2].value = variant[name_2].toString();
    };
    Settings.current = null;
    Settings.defaultViewOptions = {
        distance: 5,
        height: 2
    };
    return Settings;
}());
exports.Settings = Settings;
function view(_viewOptions) {
    if (!Settings.current)
        return;
    Settings.current.viewOptions = _viewOptions;
}
exports.view = view;
var Slider = /** @class */ (function () {
    function Slider(options) {
        this.elt = $('<span>').addClass('ui-slider')[0];
        this.inputElt = $('<input>').appendTo(this.elt)[0];
        this.echoElt = $('<span>').appendTo(this.elt).addClass('ui-value')[0];
        $(this.inputElt)
            .attr('type', 'range')
            .attr('min', options.min)
            .attr('max', options.max)
            .attr('step', options.step || 1)
            .attr('value', options.value);
        $(this.echoElt).text(this.inputElt.value);
    }
    Slider.prototype.activate = function () {
        var _this = this;
        $(this.inputElt)
            .on('change', function () {
            log('change', _this.value);
            designer.change();
        })
            .on('input', function () {
            $(_this.echoElt).text(_this.inputElt.value);
        });
    };
    Object.defineProperty(Slider.prototype, "value", {
        get: function () {
            return parseFloat(this.inputElt.value);
        },
        set: function (value) {
            this.inputElt.value = value.toString();
        },
        enumerable: true,
        configurable: true
    });
    return Slider;
}());
function slider(options) {
    if (!Settings.current)
        return;
    // remember default settings
    Settings.current.defaultVariant[options.name] = options.value;
    // create Slider
    var setting = Settings.current.settings[options.name];
    if (!setting) {
        log('new slider', options.min, options.max, options.step, options.value);
        setting = new Slider(options);
        //.attr('id', 'slider-' + name
        Settings.current.settings[options.name] = setting;
    }
    log('value', options.name, setting.value);
    return parseFloat(setting.value);
}
exports.slider = slider;
var Fun = /** @class */ (function () {
    function Fun(pts) {
        this.pts = pts;
    }
    Fun.prototype.rescale = function () {
        var curve = this.bind();
        var max = 0;
        for (var i = 0; i <= 100; i++) {
            var y = curve(i / 100);
            if (y > max)
                max = y;
        }
        for (var i_1 = 0; i_1 < this.pts.length; i_1++)
            this.pts[i_1].y /= max;
    };
    return Fun;
}());
var Parametric = /** @class */ (function (_super) {
    __extends(Parametric, _super);
    function Parametric(pts) {
        var _this = _super.call(this, pts) || this;
        _this.parms = _this.pts.map(function () { return 0; });
        return _this;
    }
    Parametric.prototype.bind = function () {
        var _this = this;
        var norm = function (v) { return Math.sqrt(v.reduce(function (a, b) { return a + Math.pow(b, 2); }, 0)); };
        var err = function (parms) { return norm(_this.pts.map(function (p) { return p.y - _this.fun(p.x, parms); })); };
        var soln = numeric.uncmin(err, this.parms);
        this.parms = soln.solution;
        log('soln', soln.iterations, soln.f, this.parms.join(','));
        return function (x) { return _this.fun(x, _this.parms); };
    };
    return Parametric;
}(Fun));
var Fourier = /** @class */ (function (_super) {
    __extends(Fourier, _super);
    function Fourier(pts, wave) {
        var _this = _super.call(this, pts) || this;
        _this.wave = wave;
        return _this;
    }
    Fourier.prototype.fun = function (x, parms) {
        var v = parms[0];
        var f = 2 * Math.PI / this.wave;
        for (var i = 1; 2 * i - 1 < parms.length; i++) {
            v += parms[2 * i - 1] * Math.sin(f * i * x);
            if (2 * i >= parms.length)
                break;
            v += parms[2 * i] * Math.cos(f * i * x);
        }
        return v;
    };
    return Fourier;
}(Parametric));
var Polynomial = /** @class */ (function (_super) {
    __extends(Polynomial, _super);
    function Polynomial() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Polynomial.prototype.fun = function (x, parms) {
        var v = 0;
        var xn = 1;
        for (var _i = 0, parms_1 = parms; _i < parms_1.length; _i++) {
            var p = parms_1[_i];
            v += p * xn;
            xn *= x;
        }
        return v;
    };
    return Polynomial;
}(Parametric));
var Hybrid = /** @class */ (function (_super) {
    __extends(Hybrid, _super);
    function Hybrid(pts) {
        var _this = _super.call(this, pts) || this;
        _this.parms = [1, 0.5, 0, 0, 0.5];
        return _this;
    }
    Hybrid.prototype.fun = function (x, parms) {
        var f = parms[0] * 2 * Math.PI;
        var a = parms[1];
        var b = parms[2];
        var c = parms[3];
        var d = parms[4];
        return a * Math.sin(f * x) + b * Math.cos(f * x) + c * x + d;
    };
    return Hybrid;
}(Parametric));
var Lines = /** @class */ (function (_super) {
    __extends(Lines, _super);
    function Lines() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Lines.prototype.bind = function () {
        var _this = this;
        return function (x) {
            for (var i = 0; i < _this.pts.length - 1; i++) {
                var x0 = _this.pts[i].x;
                var x1 = _this.pts[i + 1].x;
                if (x0 <= x && x <= x1) {
                    var y0 = _this.pts[i].y;
                    var y1 = _this.pts[i + 1].y;
                    return y0 + (x - x0) / (x1 - x0) * (y1 - y0);
                }
            }
            return NaN;
        };
    };
    return Lines;
}(Fun));
var Curve = /** @class */ (function () {
    function Curve(kind, pts) {
        this.elt = $('<canvas>')
            .attr('width', Curve.width * Curve.factor)
            .attr('height', Curve.height * Curve.factor)
            .css('width', Curve.width + 'px')
            .css('height', Curve.height + 'px')[0];
        this.kind = Curve.kinds[kind] ? kind : Object.keys(Curve.kinds)[0];
        this.fun = Curve.kinds[this.kind](pts);
        this.draw(true);
    }
    Object.defineProperty(Curve.prototype, "value", {
        get: function () {
            return this.fun.pts;
        },
        set: function (pts) {
            this.fun.pts = pts;
        },
        enumerable: true,
        configurable: true
    });
    Curve.prototype.draw = function (final) {
        // reset canvas state
        this.elt.width = this.elt.width;
        // get the curve function
        if (final)
            this.fun.rescale();
        var curve = this.fun.bind();
        // draw the curve
        var ctx = this.elt.getContext("2d");
        var d;
        ctx.strokeStyle = 'rgb(0,0,0)';
        ctx.fillStyle = final ? 'rgb(250,250,250)' : 'rgb(245,245,245)';
        ctx.lineWidth = Curve.factor * 1;
        ctx.beginPath();
        var n = 100;
        d = Curve.D(0, 0);
        ctx.moveTo(d.x, d.y);
        for (var i = 0; i <= n; i++) {
            var x = i / n;
            d = Curve.D(x, curve(x));
            ctx.lineTo(d.x, d.y);
        }
        d = Curve.D(1, 0);
        ctx.lineTo(d.x, d.y);
        d = Curve.D(0, 0);
        ctx.lineTo(d.x, d.y);
        ctx.stroke();
        ctx.fill();
        // draw the control points
        for (var _i = 0, _a = this.value; _i < _a.length; _i++) {
            var p = _a[_i];
            ctx.strokeStyle = 'rgb(255,0,0)';
            ctx.lineWidth = Curve.factor * 1;
            ctx.beginPath();
            d = Curve.D(p.x, p.y);
            ctx.arc(d.x, d.y, Curve.radius * Curve.factor, 0, 2 * Math.PI, true);
            ctx.stroke();
        }
    };
    Curve.prototype.activate = function () {
        var _this = this;
        // add kind selector underneath name
        var kindSelect = $('<select>')
            .on('change', function () {
            _this.kind = kindSelect.value;
            _this.fun = Curve.kinds[_this.kind](_this.fun.pts);
            _this.draw(true);
            designer.change();
        })[0];
        for (var kind in Curve.kinds)
            $('<option>').attr('value', kind).text(kind).appendTo(kindSelect);
        $('#ui tr:last-child .ui-name').addClass('curve-name').append(kindSelect);
        kindSelect.value = this.kind;
        $(this.elt).on('mousedown', function (e) {
            // which point are we moving (if any)?
            var moving = -1;
            var rect = e.target.getBoundingClientRect();
            var x = e.clientX - rect.left, y = e.clientY - rect.top;
            for (var i = 0; i < _this.value.length; i++) {
                var d = Curve.D(_this.value[i].x, _this.value[i].y);
                if (Math.pow((x - d.x / Curve.factor), 2) + Math.pow((y - d.y / Curve.factor), 2) < Math.pow(Curve.radius, 2))
                    moving = i;
            }
            if (moving < 0)
                return;
            var mousemove = function (e) {
                var rect = _this.elt.getBoundingClientRect();
                var x = e.clientX - rect.left, y = e.clientY - rect.top;
                _this.value[moving].x = Math.min(Math.max((x - Curve.padX) / (Curve.width - 2 * Curve.padX), 0), 1);
                _this.value[moving].y = Math.min(Math.max(1 - (y - Curve.padY) / (Curve.height - 2 * Curve.padY), 0), 1);
                _this.draw(false);
            };
            $(_this.elt).on('mousemove', mousemove);
            $(window).on('mousemove', mousemove);
            var mouseup = function () {
                $(_this.elt).unbind('mousemove', mousemove);
                $(_this.elt).unbind('mouseup', mouseup);
                $(window).unbind('mousemove', mousemove);
                $(window).unbind('mouseup', mouseup);
                _this.draw(true);
                designer.change();
            };
            $(_this.elt).on('mouseup', mouseup);
            $(window).on('mouseup', mouseup);
            window.addEventListener('click', function (e) {
                e.stopPropagation();
            }, { capture: true, once: true });
        });
    };
    Curve.kinds = {
        'poly': function (pts) { return new Polynomial(pts); },
        '¼ wave': function (pts) { return new Fourier(pts, 4); },
        '½ wave': function (pts) { return new Fourier(pts, 2); },
        '1 wave': function (pts) { return new Fourier(pts, 1); },
        'lines': function (pts) { return new Lines(pts); },
        'hybrid': function (pts) { return new Hybrid(pts); },
    };
    // curve widget dimensions
    // xxx use css?
    Curve.width = 200;
    Curve.height = 80;
    Curve.padX = 6;
    Curve.padY = 10;
    Curve.factor = 2;
    Curve.radius = 5;
    // curve coordinates to drawing coordinates
    // divide by Curve.factor to get mouse coordinates
    Curve.D = function (x, y) {
        x = (x * (Curve.width - 2 * Curve.padX) + Curve.padX) * Curve.factor;
        y = ((1 - y) * (Curve.height - 2 * Curve.padY) + Curve.padY) * Curve.factor;
        return { x: x, y: y };
    };
    return Curve;
}());
function curve(options) {
    if (!Settings.current)
        return;
    // remember default settings
    // xxx need to generalize Variant
    //Settings.current.defaultVariant[options.name] = options.value
    // create Curve
    var setting = Settings.current.settings[options.name];
    if (!setting) {
        log('new curve');
        setting = new Curve(options.kind, options.value);
        Settings.current.settings[options.name] = setting;
    }
    var scale = options.scale || 1;
    var fun = setting.fun.bind();
    return function (s) { return fun(s) * scale; };
}
exports.curve = curve;
