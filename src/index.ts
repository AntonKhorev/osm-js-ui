import Sidebar from './sidebar'
import Map from './map'
import {makeDiv, makeButton} from './util'
import MenuModule from './modules/menu'
import TestModule from './modules/test'
import SettingsModule from './modules/settings'

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
	const sidebar=new Sidebar($sidebar)
	sidebar.setModule(new TestModule)
	const $mapTopButtons=makeDiv('buttons','top')()
	const $map=makeDiv('map')($mapTopButtons)
	new Map($map)

	const $ui=makeDiv('ui','with-sidebar','with-map')($sidebar,$map)
	$ui.addEventListener('module',ev=>{
		console.log('got module event',(<CustomEvent<string>>ev).detail)
	})
	document.body.append($ui)

	const getOrientation=()=>$ui.classList.contains('portrait')?'portrait':'landscape'
	const storePaneVisibility=():void=>{
		const orientation=getOrientation()
		const sidebarKey=`${storagePrefix}-${orientation}-sidebar-visible`
		const mapKey=`${storagePrefix}-${orientation}-map-visible`
		localStorage[sidebarKey]=$ui.classList.contains('with-sidebar')?'1':''
		localStorage[mapKey]=$ui.classList.contains('with-map')?'1':''
	}
	const restorePaneVisibility=():void=>{
		const orientation=getOrientation()
		const sidebarKey=`${storagePrefix}-${orientation}-sidebar-visible`
		const mapKey=`${storagePrefix}-${orientation}-map-visible`
		let withSidebar=!!localStorage[sidebarKey]
		let withMap=!!localStorage[mapKey]
		if (!withSidebar && !withMap) withSidebar=withMap=true
		$ui.classList.toggle('with-sidebar',withSidebar)
		$ui.classList.toggle('with-map',withMap)
	}
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
			storePaneVisibility()
			updateTopButtons()
		}
		sidebar.setModule(new MenuModule)
	}
	$splitUi.onclick=()=>{
		$ui.classList.add('with-sidebar')
		$ui.classList.add('with-map')
		storePaneVisibility()
		updateTopButtons()
	}
	$closeSidebar.onclick=()=>{
		$ui.classList.remove('with-sidebar')
		$ui.classList.add('with-map')
		storePaneVisibility()
		updateTopButtons()
	}
	$closeMap.onclick=()=>{
		$ui.classList.remove('with-map')
		$ui.classList.add('with-sidebar')
		storePaneVisibility()
		updateTopButtons()
	}

	const pickSplit=<T>(vlr:T,vud:T):T=>$ui.classList.contains('up-down')?vud:vlr
	const getSplit=()=>pickSplit('left-right','up-down')
	const getSidebarFractionKey=():string=>{
		const orientation=getOrientation()
		const split=getSplit()
		return `${storagePrefix}-${orientation}-${split}-sidebar-fraction`
	}

	const getSidebarSize=()=>pickSplit($sidebar.clientWidth,$sidebar.clientHeight)
	const setPaneSizes=(sidebarFraction:number):void=>{
		const magnitude=100000
		const sidebarGrow=Math.round(sidebarFraction*magnitude)
		const mapGrow=magnitude-sidebarGrow
		$sidebar.style.flexGrow=String(sidebarGrow)
		$map.style.flexGrow=String(mapGrow)
	}
	const restorePaneSizes=():void=>{
		const storageKey=getSidebarFractionKey()
		const sidebarFraction=parseFloat(localStorage[storageKey]??'0.5')
		setPaneSizes(sidebarFraction)
	}
	const storePaneSizes=():void=>{
		const storageKey=getSidebarFractionKey()
		const sidebarGrow=parseFloat($sidebar.style.flexGrow)
		const mapGrow=parseFloat($map.style.flexGrow)
		localStorage[storageKey]=sidebarGrow/(sidebarGrow+mapGrow)
	}
	$rotateUi.onclick=()=>{
		const orientation=getOrientation()
		if ($ui.classList.contains('up-down')) {
			$ui.classList.remove('up-down')
			$ui.classList.add('left-right')
			localStorage[`${storagePrefix}-${orientation}-split`]='left-right'
		} else {
			$ui.classList.remove('left-right')
			$ui.classList.add('up-down')
			localStorage[`${storagePrefix}-${orientation}-split`]='up-down'
		}
		restorePaneSizes()
	}

	const calculateSidebarFraction=(sidebarSize:number):number=>{
		const uiSize=pickSplit($ui.clientWidth,$ui.clientHeight)
		const sidebarBasis=parseInt(getComputedStyle($sidebar).flexBasis)
		const mapBasis=parseInt(getComputedStyle($sidebar).flexBasis)
		const sidebarFraction=(sidebarSize-sidebarBasis)/(uiSize-sidebarBasis-mapBasis)
		if (sidebarFraction<0) return 0
		if (sidebarFraction>1) return 1
		return sidebarFraction
	}
	let moveStartOffset:number|undefined
	$resizeUi.onpointerdown=ev=>{
		const sidebarSize=getSidebarSize()
		const pointerPosition=pickSplit(ev.clientX,ev.clientY)
		moveStartOffset=pointerPosition-sidebarSize
		$resizeUi.setPointerCapture(ev.pointerId)
	}
	$resizeUi.onpointerup=ev=>{
		$resizeUi.releasePointerCapture(ev.pointerId)
		moveStartOffset=undefined
		storePaneSizes()
	}
	$resizeUi.onpointermove=ev=>{
		if (moveStartOffset==null) return
		const pointerPosition=pickSplit(ev.clientX,ev.clientY)
		const sidebarFraction=calculateSidebarFraction(pointerPosition-moveStartOffset)
		setPaneSizes(sidebarFraction)
	}
	$resizeUi.onkeydown=ev=>{
		const stepBase=8
		let step:number|undefined
		if (ev.key=='ArrowLeft' || ev.key=='ArrowUp') {
			step=-stepBase
		} else if (ev.key=='ArrowRight' || ev.key=='ArrowDown') {
			step=+stepBase
		} else {
			return
		}
		if (step==null) return
		const sidebarFraction=calculateSidebarFraction(getSidebarSize()+step)
		setPaneSizes(sidebarFraction)
		storePaneSizes()
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
		restorePaneVisibility()
		restorePaneSizes()
		updateTopButtons()
	})
	resizeObserver.observe($ui)
}
