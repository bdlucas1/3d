import * as $ from 'jquery'
import {remote} from 'electron'
import * as editor from '../editor/editor'

const log = remote.getGlobal('console').log

type ViewOptions = {
    distance: number,
    height: number
}

export let viewOptions: ViewOptions = {
    distance: 5,
    height: 2
}

export function view(options: ViewOptions) {
    viewOptions = options
}

export type UI = {[name: string]: HTMLInputElement}
let ui: UI = {}

export function load(u: UI) {
    ui = u? u : {}
}

export function get(): UI {
    return ui
}

export function show() {
    $('#ui').empty()
    for (const name in ui) {
        const input = ui[name]
        const tr = $('<tr>').appendTo('#ui')
        $('<td>').appendTo(tr).addClass('ui-name').text(name)
        $('<td>').appendTo(tr).addClass('ui-input').append(input)
        const valueElt = $('<td>').addClass('ui-value').appendTo(tr).text(input.value)
        $(input)
            .on('change', () => {
                log('change', input.value)
                valueElt.text(input.value)
                editor.change()
            })
            .on('input', () => {
                valueElt.text(input.value)
            })
    }
}

export function slider(options: {
    name: string,
    min: number,
    max: number,
    step?: number,
    value: number,
    //increment: number,
}) {
    let input = ui[options.name]
    if (!input) {
        log('new slider', options.min, options.max, options.step, options.value)
        input = <HTMLInputElement>$('<input>')
            .attr('type', 'range')
            .attr('min', options.min)
            .attr('max', options.max)
            .attr('step', options.step || 1)
            .attr('value', options.value)
            .text(name)
        [0]

        //.attr('id', 'slider-' + name
        ui[options.name] = input
    }
    log('value', options.name, input.value)
    return parseFloat(input.value)
}
    
