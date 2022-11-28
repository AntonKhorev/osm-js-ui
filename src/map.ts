import {makeEscapeTag, makeDiv, makeButton, makeLink} from './util'

const e=makeEscapeTag(encodeURIComponent)

const tileSize=256
const tileSizePow=8

const maxZoom=19
const initialZoom=17
const initialLat=59.93903
const initialLon=30.31582

export default class Map {
	constructor($map: HTMLElement) {
		const $zoomIn=makeButton(`Zoom in`,'zoom-in')
		const $zoomOut=makeButton(`Zoom out`,'zoom-out')
		const $zoomButtons=makeDiv('buttons','controls')($zoomIn,$zoomOut)

		const $surface=makeDiv('surface')()
		$surface.tabIndex=0
		const $tiles=makeDiv('tiles')()
		const $crosshair=makeDiv('crosshair')()
		$crosshair.innerHTML=`<svg><use href="#map-crosshair" /></svg>`
		const $attribution=makeDiv('attribution')(
			`© `,makeLink(`OpenStreetMap contributors`,`https://www.openstreetmap.org/copyright`)
		)
		$map.append($zoomButtons,$surface,$tiles,$crosshair,$attribution)

		let position:[x:number,y:number,z:number]=calculatePosition(initialZoom,initialLat,initialLon)

		const updateHash=()=>{
			const [zoom,lat,lon]=calculateCoords(...position)
			const mapHash=`#map=${zoom.toFixed(0)}/${lat.toFixed(5)}/${lon.toFixed(5)}`
			history.replaceState(null,'',mapHash)
		}

		const replaceTiles=()=>{
			$tiles.innerHTML=''
			const [x,y,z]=position
			const tileX=Math.floor(x/tileSize)
			const tileY=Math.floor(y/tileSize)
			const transX=-x%tileSize
			const transY=-y%tileSize
			const viewHalfSizeX=$map.clientWidth/2
			const viewHalfSizeY=$map.clientHeight/2
			const tileRange=Math.pow(2,z)
			const tileMask=tileRange-1
			const nExtraTilesXL=
				Math.floor((viewHalfSizeX+transX)/tileSize)+1
			const nExtraTilesXU=
				Math.floor((viewHalfSizeX-transX)/tileSize)
			const nExtraTilesYL=Math.min(
				tileY,
				Math.floor((viewHalfSizeY+transY)/tileSize)+1
			)
			const nExtraTilesYU=Math.min(
				tileRange-tileY-1,
				Math.floor((viewHalfSizeY-transY)/tileSize)
			)
			for (let iTileY=-nExtraTilesYL;iTileY<=nExtraTilesYU;iTileY++) {
				for (let iTileX=-nExtraTilesXL;iTileX<=nExtraTilesXU;iTileX++) {
					const tileUrl=e`https://tile.openstreetmap.org/${z}/${(tileX+iTileX)&tileMask}/${tileY+iTileY}.png`
					const $img=document.createElement('img')
					$img.src=tileUrl
					$img.style.translate=`${transX+iTileX*tileSize}px ${transY+iTileY*tileSize}px`
					$tiles.append($img)
				}
			}
		}

		window.onhashchange=ev=>{
			const paramString = (location.hash[0]=='#')
				? location.hash.slice(1)
				: location.hash
			const searchParams=new URLSearchParams(paramString)
			const mapHash=searchParams.get('map')
			if (!mapHash) return
			const [zoomString,latString,lonString]=mapHash.split('/')
			const zoom=parseInt(zoomString,10)
			const lat=parseFloat(latString)
			const lon=parseFloat(lonString)
			if (isNaN(zoom) || isNaN(lat) || isNaN(lon)) return
			const zoom1=Math.min(maxZoom,Math.max(0,zoom))
			const [x,y,z]=calculatePosition(zoom1,lat,lon)
			const mask=Math.pow(2,z+tileSizePow)-1
			const x1=x&mask
			let y1=Math.min(mask,Math.max(0,y))
			position=[x1,y1,z]
			if (zoom!=zoom1 || x!=x1 || y!=y1) updateHash()
			replaceTiles()
		}

		const resizeObserver=new ResizeObserver(replaceTiles)
		resizeObserver.observe($map)

		const pan=(dx:number,dy:number)=>{
			const [x,y,z]=position
			const mask=Math.pow(2,z+tileSizePow)-1
			position=[
				(x+dx)&mask,
				Math.min(mask,Math.max(0,(y+dy))),
				z
			]
			replaceTiles()
		}
		const zoom=(dx:number,dy:number,dz:number)=>{
			let [x,y,z]=position
			if (z+dz<0) dz=-z
			if (z+dz>maxZoom) dz=maxZoom-z
			if (dz==0) return
			z+=dz
			const f=Math.pow(2,dz)
			x=Math.floor(f*x+(f-1)*dx)
			y=Math.floor(f*y+(f-1)*dy)
			position=[x,y,z]
			replaceTiles()
		}
		const mouseZoom=(ev:MouseEvent,dz:number)=>{
			const viewHalfSizeX=$map.clientWidth/2
			const viewHalfSizeY=$map.clientHeight/2
			const dx=ev.offsetX-viewHalfSizeX
			const dy=ev.offsetY-viewHalfSizeY
			zoom(dx,dy,dz)
		}

		let moveLastX:number|undefined
		let moveLastY:number|undefined
		$surface.onpointerdown=ev=>{
			moveLastX=ev.clientX
			moveLastY=ev.clientY
			$surface.setPointerCapture(ev.pointerId)
			$surface.classList.add('grabbed')
		}
		$surface.onpointerup=ev=>{
			$surface.classList.remove('grabbed')
			$surface.releasePointerCapture(ev.pointerId)
			moveLastX=moveLastY=undefined
			updateHash()
		}
		$surface.onpointermove=ev=>{
			if (moveLastX==null || moveLastY==null) return
			pan(moveLastX-ev.clientX,moveLastY-ev.clientY)
			moveLastX=ev.clientX
			moveLastY=ev.clientY
		}

		$surface.onwheel=ev=>{
			const dz=-Math.sign(ev.deltaY)
			if (!dz) return
			mouseZoom(ev,dz)
			updateHash()
		}
		$surface.ondblclick=ev=>{
			mouseZoom(ev,ev.shiftKey?-1:+1)
			updateHash()
		}
		$zoomIn.onclick=()=>{
			zoom(0,0,+1)
			updateHash()
		}
		$zoomOut.onclick=()=>{
			zoom(0,0,-1)
			updateHash()
		}

		$surface.onkeydown=ev=>{
			const panStepBase=32
			const multiplier=ev.shiftKey?3:1
			const panStep=panStepBase*multiplier
			if (ev.key=='ArrowLeft') {
				pan(-panStep,0)
			} else if (ev.key=='ArrowRight') {
				pan(+panStep,0)
			} else if (ev.key=='ArrowUp') {
				pan(0,-panStep)
			} else if (ev.key=='ArrowDown') {
				pan(0,+panStep)
			} else if (ev.key=='+') {
				zoom(0,0,+multiplier)
			} else if (ev.key=='-') {
				zoom(0,0,-multiplier)
			} else {
				return
			}
			updateHash()
			ev.stopPropagation()
			ev.preventDefault()
		}
	}
}

function calculatePosition(zoom:number,lat:number,lon:number):[x:number,y:number,z:number] {
	return [
		Math.floor(Math.pow(2,zoom+tileSizePow)*(lon+180)/360),
		Math.floor(Math.pow(2,zoom+tileSizePow)*(1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2),
		zoom
	]
}

function calculateCoords(x:number,y:number,z:number):[zoom:number,lat:number,lon:number] {
	const n=Math.PI-2*Math.PI*y/Math.pow(2,z+tileSizePow)
	return [
		z,
		180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))),
		x/Math.pow(2,z+tileSizePow)*360-180
	]
}
