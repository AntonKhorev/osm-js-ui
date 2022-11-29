import Sidebar from './sidebar'
import Map from './map'
import {makeDiv, makeButton} from './util'

const storagePrefix='osm-ui'

main()

async function main() {
	const $openMenu=makeButton(`Open sidebar menu`,'menu')
	const $closeSidebar=makeButton(`Close sidebar`,'close')
	const $splitUi=makeButton(`Enable split view`,'layout','split')
	const $resizeUi=makeButton(`Resize sidebar and map`,'resize')
	const $rotateUi=makeButton(`Rotate sidebar and map`,'layout','rotate')
	const $closeMap=makeButton(`Close map`,'close')

	const $sidebarTopButtons=makeDiv('buttons','top')()
	const $sidebar=makeDiv('sidebar')($sidebarTopButtons)
	new Sidebar($sidebar)
	const $mapTopButtons=makeDiv('buttons','top')()
	const $map=makeDiv('map')($mapTopButtons)
	new Map($map)
	const $ui=makeDiv('ui','with-sidebar','with-map')($sidebar,$map)
	document.body.append($ui)

	const updateTopButtons=()=>{
		const withSidebar=$ui.classList.contains('with-sidebar')
		const withMap=$ui.classList.contains('with-map')
		$sidebarTopButtons.replaceChildren()
		$mapTopButtons.replaceChildren()
		if (withSidebar) {
			$sidebarTopButtons.append($openMenu)
		} else if (withMap) {
			$mapTopButtons.append($openMenu)
		}
		if (withSidebar && withMap) {
			$mapTopButtons.append($resizeUi,$rotateUi)
		}
		if (withSidebar) {
			if (withMap) {
				$sidebarTopButtons.append($closeSidebar)
			} else {
				$sidebarTopButtons.append($splitUi)
			}
		}
		if (withMap) {
			if (withSidebar) {
				$mapTopButtons.append($closeMap)
			} else {
				$mapTopButtons.append($splitUi)
			}
		}
	}
	$openMenu.onclick=()=>{
		if (!$ui.classList.contains('with-sidebar')) {
			$ui.classList.add('with-sidebar')
			updateTopButtons()
		}
		// TODO open menu
	}
	$splitUi.onclick=()=>{
		$ui.classList.add('with-sidebar')
		$ui.classList.add('with-map')
		updateTopButtons()
	}
	$closeSidebar.onclick=()=>{
		$ui.classList.remove('with-sidebar')
		$ui.classList.add('with-map')
		updateTopButtons()
	}
	$closeMap.onclick=ev=>{
		$ui.classList.remove('with-map')
		$ui.classList.add('with-sidebar')
		updateTopButtons()
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
	$rotateUi.onclick=()=>{
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
	const getSidebarPercentage=(sidebarSize:number|undefined)=>{
		const uiSize=pickSplit($ui.clientWidth,$ui.clientHeight)
		if (sidebarSize==null || uiSize==null) return
		return sidebarSize/uiSize*100
	}

	let moveStartOffset:number|undefined
	$resizeUi.onpointerdown=ev=>{
		const sidebarSize=getSidebarSize()
		const pointerPosition=pickSplit(ev.clientX,ev.clientY)
		if (sidebarSize==null || pointerPosition==null) return
		moveStartOffset=pointerPosition-sidebarSize
		$sidebar.style.flexBasis=sidebarSize+'px' // TODO maybe update only in move listener
		$resizeUi.setPointerCapture(ev.pointerId)
	}
	$resizeUi.onpointerup=ev=>{
		$resizeUi.releasePointerCapture(ev.pointerId)
		moveStartOffset=undefined
		const sidebarPercentage=getSidebarPercentage(getSidebarSize())
		if (sidebarPercentage==null) return
		$sidebar.style.flexBasis=sidebarPercentage.toFixed(4)+'%'
		storeSidebarPercentage()
	}
	$resizeUi.onpointermove=ev=>{
		if (moveStartOffset==null) return
		const pointerPosition=pickSplit(ev.clientX,ev.clientY)
		if (pointerPosition==null) return
		const newSidebarSize=pointerPosition-moveStartOffset
		$sidebar.style.flexBasis=newSidebarSize+'px'
	}
	$resizeUi.onkeydown=ev=>{
		const stepBase=8
		const sidebarSize=getSidebarSize()
		if (sidebarSize==null) return
		let step:number|undefined
		if (ev.key=='ArrowLeft' || ev.key=='ArrowUp') {
			step=-stepBase
		} else if (ev.key=='ArrowRight' || ev.key=='ArrowDown') {
			step=+stepBase
		} else {
			return
		}
		if (step==null) return
		const sidebarPercentage=getSidebarPercentage(sidebarSize+step)
		if (sidebarPercentage==null) return
		$sidebar.style.flexBasis=sidebarPercentage.toFixed(4)+'%'
		storeSidebarPercentage()
		ev.stopPropagation()
		ev.preventDefault()
	}

	const resizeObserver=new ResizeObserver(()=>{
		const flip=(removedOrientation:string,addedOrientation:string,defaultSplit:string)=>{
			$ui.classList.remove(removedOrientation,'left-right','up-down')
			const storageKey=`${storagePrefix}-${addedOrientation}-split`
			const split=localStorage[storageKey]??defaultSplit
			$ui.classList.add(addedOrientation,split)
		}
		if ($ui.clientWidth>=$ui.clientHeight) {
			flip('portrait','landscape','left-right')
		} else {
			flip('landscape','portrait','up-down')
		}
		restoreSidebarPercentage()
		updateTopButtons()
	})
	resizeObserver.observe($ui)
}
