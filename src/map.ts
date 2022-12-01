import {makeEscapeTag, escapeXml, makeDiv, makeButton, makeLink} from './util'

const eu=makeEscapeTag(encodeURIComponent)
const ex=makeEscapeTag(escapeXml)

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
		const $tiles=makeDiv('layer','tiles')()
		const $mesh=makeDiv('layer','mesh')()
		const $crosshair=makeDiv('layer','crosshair')()
		$crosshair.innerHTML=`<svg><use href="#map-crosshair" /></svg>`
		const $attribution=makeDiv('attribution')(
			`© `,makeLink(`OpenStreetMap contributors`,`https://www.openstreetmap.org/copyright`)
		)
		$map.append($zoomButtons,$surface,$tiles,$mesh,$crosshair,$attribution)

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
					const tileUrl=eu`https://tile.openstreetmap.org/${z}/${(tileX+iTileX)&tileMask}/${tileY+iTileY}.png`
					const $img=document.createElement('img')
					$img.src=tileUrl
					$img.style.translate=`${transX+iTileX*tileSize}px ${transY+iTileY*tileSize}px`
					$tiles.append($img)
				}
			}
		}
		const redrawMesh=()=>{
			const [x,y,z]=position
			const viewSizeX=$map.clientWidth
			const viewSizeY=$map.clientHeight
			const x1=x-Math.floor(viewSizeX/2)
			const y1=y-Math.floor(viewSizeY/2)
			const x2=x+Math.floor(viewSizeX/2)
			const y2=y+Math.floor(viewSizeY/2)
			const [,lat1,lon1]=calculateCoords(x1,y1,z)
			const [,lat2,lon2]=calculateCoords(x2,y2,z)
			const viewMinSize=Math.min(viewSizeX,viewSizeY)
			const x1c=x-Math.floor(viewMinSize/2)
			const y1c=y-Math.floor(viewMinSize/2)
			const x2c=x+Math.floor(viewMinSize/2)
			const y2c=y+Math.floor(viewMinSize/2)
			const [,lat1c,lon1c]=calculateCoords(x1c,y1c,z)
			const [,lat2c,lon2c]=calculateCoords(x2c,y2c,z)
			const calculateScaleAndStep=(latOrLonSpan:number):[scale:number,step:number]=>{
				const logSpan=Math.log10(latOrLonSpan/2)
				const scale=Math.floor(logSpan)
				const remainder=logSpan-scale
				let digit=1
				if (remainder>Math.log10(5)) {
					digit=5
				} else if (remainder>Math.log10(2)) {
					digit=2
				}
				const step=digit*10**scale
				return [scale,step]
			}
			let svg=ex`<svg width="${viewSizeX}" height="${viewSizeY}">`
			// lat
			{
				const [latScale,latStep]=calculateScaleAndStep(lat1c-lat2c)
				const latBase=Math.ceil(lat2/latStep)*latStep
				for (let i=0;;i++) {
					const currentLat=latBase+i*latStep
					if (currentLat>lat1) break
					const currentY=calculateY(z,currentLat)
					const vy=currentY-y1+0.5
					svg+=ex`<line x2="${viewSizeX}" y1="${vy}" y2="${vy}" />`
					const s=currentLat.toFixed(Math.max(0,-latScale))
					const o=4;
					svg+=ex`<text x="${0.5+o}" y="${vy-o}">${s}</text>`
				}
			}
			// lon
			{
				const [lonScale,lonStep]=calculateScaleAndStep(lon2c-lon1c)
				const lonBase=Math.ceil(lon1/lonStep)*lonStep
				for (let i=0;;i++) {
					const currentLon=lonBase+i*lonStep
					if (currentLon>lon2) break
					const currentX=calculateX(z,currentLon)
					const vx=currentX-x1+0.5
					svg+=ex`<line y2="${viewSizeY}" x1="${vx}" x2="${vx}" />`
					const wrappedLon=180-((180-currentLon)%360+360)%360
					const s=wrappedLon.toFixed(Math.max(0,-lonScale))
					const o=4;
					svg+=ex`<text y="${viewSizeY-0.5-o}" x="${vx+o}">${s}</text>`
				}
			}
			svg+=`</svg>`
			$mesh.innerHTML=svg
		}
		const redrawMap=()=>{
			replaceTiles()
			redrawMesh()
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
			redrawMap()
		}

		const resizeObserver=new ResizeObserver(redrawMap)
		resizeObserver.observe($map)

		const pan=(dx:number,dy:number)=>{
			const [x,y,z]=position
			const mask=Math.pow(2,z+tileSizePow)-1
			position=[
				(x+dx)&mask,
				Math.min(mask,Math.max(0,(y+dy))),
				z
			]
			redrawMap()
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
			redrawMap()
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

function calculateX(zoom:number,lon:number):number {
	return Math.floor(Math.pow(2,zoom+tileSizePow)*(lon+180)/360)
}
function calculateY(zoom:number,lat:number):number {
	return Math.floor(Math.pow(2,zoom+tileSizePow)*(1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2)
}
function calculatePosition(zoom:number,lat:number,lon:number):[x:number,y:number,z:number] {
	return [
		calculateX(zoom,lon),
		calculateY(zoom,lat),
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
