import {makeElement} from './util'

export default class Sidebar {
	constructor($sidebar: HTMLElement) {
		const $main=makeElement('main')()(
			makeElement('h1')()(
				`Temporary sidebar title`
			)
		)
		for (let i=0;i<30;i++) {
			$main.append(makeElement('p')()(
				`Lorem ipsum ${i}!`
			))
		}
		$sidebar.append($main)
	}
}
