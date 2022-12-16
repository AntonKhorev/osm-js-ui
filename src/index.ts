import SidebarPane from './sidebar'
import MapPane from './map'
import {Coordinates} from './map/geo'
import {makeDiv, makeButton} from './html'
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
	const sidebar=new SidebarPane($sidebar)
	sidebar.setModule(new TestModule)
	const $mapTopButtons=makeDiv('buttons','top')()
	const $map=makeDiv('map')($mapTopButtons)
	const map=new MapPane($map)

	const $ui=makeDiv('ui','with-sidebar','with-map')($sidebar,$map)
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
		location.assign(`#module=menu`)
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
	$resizeUi.onpointerup=$resizeUi.onpointercancel=ev=>{
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

	window.onhashchange=()=>{
		const hashParams=getHashParams()
		const moduleHashValue=hashParams.get('module')
		if (moduleHashValue) {
			if (moduleHashValue=='menu') {
				sidebar.setModule(new MenuModule)
			} else if (moduleHashValue=='settings') {
				sidebar.setModule(new SettingsModule(map))
			} else if (moduleHashValue=='test') {
				sidebar.setModule(new TestModule)
			}
		}
		const mapHashValue=hashParams.get('map')
		if (mapHashValue) {
			const [zoomString,latString,lonString]=mapHashValue.split('/')
			const zoom=parseInt(zoomString,10)
			const lat=parseFloat(latString)
			const lon=parseFloat(lonString)
			if (!isNaN(zoom) && !isNaN(lat) && !isNaN(lon)) map.move(zoom,lat,lon)
		}
	}
	$map.addEventListener('osmJsUi:mapMoveEnd',ev=>{
		const hashParams=getHashParams()
		const [zoom,lat,lon]=(<CustomEvent<Coordinates>>ev).detail
		const precision=Math.max(0,Math.ceil(Math.log2(zoom)))
		hashParams.set('map',`${zoom.toFixed(0)}/${lat.toFixed(precision)}/${lon.toFixed(precision)}`)
		history.replaceState(null,'',encodeHashParams(hashParams))
	})
}

function getHashParams():URLSearchParams {
	const paramString = (location.hash[0]=='#')
			? location.hash.slice(1)
			: location.hash
	return new URLSearchParams(paramString)
}

function encodeHashParams(hashParams:URLSearchParams):string {
	// '#'+hashParams.toString() // this does too much encoding, including '/'
	const escape=(s:string)=>s.replace(
		/[^0-9a-zA-Z?/:@._~!$'()*+,;-]/g, // https://stackoverflow.com/a/26119120 except & and =
		c=>`%${c.charCodeAt(0).toString(16).toUpperCase()}` // escape like in https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI#encoding_for_rfc3986
	)
	let result=''
	for (const [k,v] of hashParams.entries()) {
		result+=result?'&':'#'
		result+=escape(k)+'='+escape(v)
	}
	return result
}
