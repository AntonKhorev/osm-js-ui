import Sidebar from './sidebar'
import Map from './map'
import {makeElement} from './util'

const makeDiv=makeElement('div')

main()

async function main() {
	const $sidebarMenu=makeElement('button')()(`Open sidebar menu`)
	const $sidebarRotate=makeElement('button')()(`Rotate sidebar`)
	const $sidebarClose=makeElement('button')()(`Close sidebar`)
	const $sidebarHeading=makeElement('h1')()()
	const $sidebarButtons=makeDiv('buttons')($sidebarMenu,$sidebarRotate,$sidebarClose,$sidebarHeading)
	const $sidebar=makeDiv('sidebar')($sidebarButtons)
	new Sidebar($sidebar,$sidebarHeading)
	const $mapClose=makeElement('button')()(`Close map`)
	const $mapButtons=makeDiv('buttons')($mapClose)
	const $map=makeDiv('map')($mapButtons)
	new Map($map)
	const $resizer=makeDiv('resizer')()
	const $ui=makeDiv('ui','with-sidebar','with-map')($sidebar,$resizer,$map)
	document.body.append($ui)

	$sidebarClose.onclick=ev=>{
		if ($ui.classList.contains('with-map')) {
			$ui.classList.remove('with-sidebar')
		} else {
			$ui.classList.add('with-map')
		}
	}
	$mapClose.onclick=ev=>{
		if ($ui.classList.contains('with-sidebar')) {
			$ui.classList.remove('with-map')
		} else {
			$ui.classList.add('with-sidebar')
		}
	}

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
	const startResizing=()=>{
		const sidebarSize=pickOriented($sidebar.clientWidth,$sidebar.clientHeight)
		if (sidebarSize==null) return
		$sidebar.style.flexBasis=sidebarSize+'px'
		$ui.classList.add('resizing')
	}
	const stopResizing=()=>{
		$ui.classList.remove('resizing')
		const sidebarSize=pickOriented($sidebar.clientWidth,$sidebar.clientHeight)
		const uiSize=pickOriented($ui.clientWidth,$ui.clientHeight)
		if (sidebarSize==null || uiSize==null) return
		const sidebarPercentSize=sidebarSize/uiSize*100
		$sidebar.style.flexBasis=sidebarPercentSize.toFixed(4)+'%'
	}
	$resizer.onmousedown=startResizing
	$ui.onmouseup=ev=>{
		if (!$ui.classList.contains('resizing')) return
		$ui.classList.remove('resizing')
		ev.stopPropagation()
		stopResizing()
	}
	$ui.addEventListener('mousemove',ev=>{
		if (!$ui.classList.contains('resizing')) return
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
