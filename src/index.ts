import Sidebar from './sidebar'
import Map from './map'
import {makeElement} from './util'

const makeDiv=makeElement('div')

const storagePrefix='osm-ui'

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
	const $mapButtons=makeDiv('buttons','size')($mapClose)
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

	const getOrientation=():string|undefined=>{
		if ($ui.classList.contains('landscape')) {
			return 'landscape'
		} else if ($ui.classList.contains('portrait')) {
			return 'portrait'
		}
	}
	const pickSplit=<T>(vlr:T,vud:T):T|undefined=>{
		if ($ui.classList.contains('left-right')) {
			return vlr
		} else if ($ui.classList.contains('up-down')) {
			return vud
		}
	}
	const getSplit=()=>pickSplit('left-right','up-down')
	const getSidebarSize=()=>pickSplit($sidebar.clientWidth,$sidebar.clientHeight)
	const getSidebarPercentage=()=>{
		const sidebarSize=getSidebarSize()
		const uiSize=pickSplit($ui.clientWidth,$ui.clientHeight)
		if (sidebarSize==null || uiSize==null) return
		return sidebarSize/uiSize*100
	}

	const getSidebarPercentageKey=()=>{
		const orientation=getOrientation()
		const split=getSplit()
		if (orientation==null || split==null) return
		return `${storagePrefix}-${orientation}-${split}-sidebar-percentage`
	}
	const restoreSidebarPercentage=()=>{
		const storageKey=getSidebarPercentageKey()
		if (storageKey==null) return
		$sidebar.style.flexBasis=localStorage[storageKey]??'30%'
	}
	const storeSidebarPercentage=()=>{
		const storageKey=getSidebarPercentageKey()
		if (storageKey==null) return
		localStorage[storageKey]=$sidebar.style.flexBasis
	}
	$sidebarRotate.onclick=()=>{
		const orientation=getOrientation()
		if (orientation==null) return
		if ($ui.classList.contains('left-right')) {
			$ui.classList.remove('left-right')
			$ui.classList.add('up-down')
			localStorage[`${storagePrefix}-${orientation}-split`]='up-down'
		} else {
			$ui.classList.remove('up-down')
			$ui.classList.add('left-right')
			localStorage[`${storagePrefix}-${orientation}-split`]='left-right'
		}
		restoreSidebarPercentage()
	}
	const resizeObserver=new ResizeObserver(()=>{
		const flip=(removedOrientation:string,addedOrientation:string,defaultSplit:string)=>{
			$ui.classList.remove(removedOrientation,'left-right','up-down')
			const storageKey=`${storagePrefix}-${addedOrientation}-split`
			const split=localStorage[storageKey]??defaultSplit
			$ui.classList.add(addedOrientation,split)
			restoreSidebarPercentage()
		}
		if ($ui.clientWidth>=$ui.clientHeight) {
			flip('portrait','landscape','left-right')
		} else {
			flip('landscape','portrait','up-down')
		}
	})
	resizeObserver.observe($ui)

	const startResizing=()=>{
		const sidebarSize=getSidebarSize()
		if (sidebarSize==null) return
		$sidebar.style.flexBasis=sidebarSize+'px'
		$ui.classList.add('resizing')
	}
	const stopResizing=()=>{
		$ui.classList.remove('resizing')
		const sidebarPercentage=getSidebarPercentage()
		if (sidebarPercentage==null) return
		$sidebar.style.flexBasis=sidebarPercentage.toFixed(4)+'%'
		storeSidebarPercentage()
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
		const sidebarSize=pickSplit($sidebar.clientWidth,$sidebar.clientHeight)
		const dSidebarSize=pickSplit(ev.movementX,ev.movementY)
		if (sidebarSize==null || dSidebarSize==null) return
		$sidebar.style.flexBasis=sidebarSize+dSidebarSize+'px'
	},true)
}
