import Sidebar from './sidebar'
import Map from './map'
import {makeElement} from './util'

const makeDiv=makeElement('div')

main()

async function main() {
	const $sidebar=makeDiv('sidebar')()
	new Sidebar($sidebar)
	const $map=makeDiv('map')()
	new Map($map)
	document.body.append(makeDiv('ui')(
		$sidebar,$map
	))
}
