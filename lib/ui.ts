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

const ui: {[name: string]: HTMLInputElement} = {}

export function slider(options: {
    name: string,
    min: number,
    max: number,
    value: number,
    //increment: number,
}) {
    let input = ui[options.name]
    if (!input) {
        input = <HTMLInputElement>$('<input>')
            .attr('type', 'range')
            .attr('min', options.min)
            .attr('max', options.max)
            .attr('value', options.value)
            .text(name)
            .on('change', () => {
                log('change', input.value)
                value.text(input.value)
                editor.change()
            })
            .on('input', () => {
                value.text(input.value)
            })
        [0]

        const tr = $('<tr>').appendTo('#ui')
        $('<td>').appendTo(tr).addClass('ui-name').text(options.name)
        $('<td>').appendTo(tr).addClass('ui-input').append(input)
        const value = $('<td>').addClass('ui-value').appendTo(tr).text(input.value)

        //.attr('id', 'slider-' + name
        ui[options.name] = input
    }
    log('value', options.name, input.value)
    return input.value
}
    
