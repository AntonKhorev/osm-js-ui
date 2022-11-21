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

	const pickOriented=(vLandscape:number,vPortrait:number)=>{
		if ($ui.classList.contains('landscape')) {
			return vLandscape
		} else if ($ui.classList.contains('portrait')) {
			return vPortrait
		}
	}

	let resizing=false
	$resizer.onmousedown=ev=>{
		const sidebarSize=pickOriented($sidebar.clientWidth,$sidebar.clientHeight)
		if (sidebarSize==null) return
		$sidebar.style.flexBasis=sidebarSize+'px'
		resizing=true
	}
	$ui.onmouseup=ev=>{
		if (!resizing) return
		ev.stopPropagation()
		resizing=false
	}
	$ui.addEventListener('mousemove',ev=>{
		if (!resizing) return
		if (!(ev.buttons&1)) {
			resizing=false
			return
		}
		ev.stopPropagation()
		const sidebarSize=pickOriented($sidebar.clientWidth,$sidebar.clientHeight)
		const dSidebarSize=pickOriented(ev.movementX,ev.movementY)
		if (sidebarSize==null || dSidebarSize==null) return
		$sidebar.style.flexBasis=sidebarSize+dSidebarSize+'px'
	},true)
}
