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
	const startResizing=()=>{
		const sidebarSize=pickOriented($sidebar.clientWidth,$sidebar.clientHeight)
		if (sidebarSize==null) return
		$sidebar.style.flexBasis=sidebarSize+'px'
		resizing=true
	}
	const stopResizing=()=>{
		resizing=false
		const sidebarSize=pickOriented($sidebar.clientWidth,$sidebar.clientHeight)
		const uiSize=pickOriented($ui.clientWidth,$ui.clientHeight)
		if (sidebarSize==null || uiSize==null) return
		const sidebarPercentSize=sidebarSize/uiSize*100
		$sidebar.style.flexBasis=sidebarPercentSize.toFixed(4)+'%'
	}
	$resizer.onmousedown=startResizing
	$ui.onmouseup=ev=>{
		if (!resizing) return
		ev.stopPropagation()
		stopResizing()
		resizing=false
	}
	$ui.addEventListener('mousemove',ev=>{
		if (!resizing) return
		ev.stopPropagation()
		if (!(ev.buttons&1)) {
			stopResizing()
			return
		}
		const sidebarSize=pickOriented($sidebar.clientWidth,$sidebar.clientHeight)
		const dSidebarSize=pickOriented(ev.movementX,ev.movementY)
		if (sidebarSize==null || dSidebarSize==null) return
		$sidebar.style.flexBasis=sidebarSize+dSidebarSize+'px'
	},true)
}
