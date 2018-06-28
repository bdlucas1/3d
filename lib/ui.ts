import * as $ from 'jquery'
import {remote} from 'electron'
import * as editor from '../editor/editor'

const log = remote.getGlobal('console').log

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
                editor.change()
            })
        [0]

        const tr = $('<tr>').appendTo('#ui')
        $('<td>').appendTo(tr).text(options.name)
        $('<td>').appendTo(tr).append(input)

        //.attr('id', 'slider-' + name
        ui[options.name] = input
    }
    log('value', options.name, input.value)
    return input.value
}
    
