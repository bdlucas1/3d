import * as $ from 'jquery'
import {remote} from 'electron'
import * as editor from '../editor/editor'

const log = remote.getGlobal('console').log

export type ViewOptions = {
    distance: number,
    height: number
}

export class Settings {

    static current: Settings | null = null

    static defaultViewOptions = {
        distance: 5,
        height: 2
    }
    
    viewOptions = Settings.defaultViewOptions

    inputs: {[name: string]: HTMLInputElement} = {}

    activate() {

        Settings.current = this

        $('#ui').empty()
        for (const name in this.inputs) {
            const input = this.inputs[name]
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

    clear() {
        this.inputs = {}
    }
}
    
export function view(_viewOptions: ViewOptions) {
    if (!Settings.current)
        return
    Settings.current.viewOptions = _viewOptions
}

export function slider(options: {
    name: string,
    min: number,
    max: number,
    step?: number,
    value: number,
    //increment: number,
}) {

    if (!Settings.current)
        return

    let input = Settings.current.inputs[options.name]
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
        Settings.current.inputs[options.name] = input
    }
    log('value', options.name, input.value)
    return parseFloat(input.value)
}
    
