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
	const $resizer=makeDiv('resizer')()
	const $ui=makeDiv('ui')(
		$sidebar,$resizer,$map
	)
	document.body.append($ui)

	const resizeObserver=new ResizeObserver(()=>{
		if ($ui.clientWidth>=$ui.clientHeight) {
			$ui.classList.remove('portrait')
			$ui.classList.add('landscape')
		} else {
			$ui.classList.remove('landscape')
			$ui.classList.add('portrait')
		}
	})
	resizeObserver.observe($ui)
}
