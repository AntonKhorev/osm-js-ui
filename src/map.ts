import {makeEscapeTag, escapeXml, makeDiv, makeButton, makeLink} from './util'

export type Coordinates = [zoom:number, lat:number, lon:number]
export type Position = [x:number,y:number,z:number]

const eu=makeEscapeTag(encodeURIComponent)
const ex=makeEscapeTag(escapeXml)

const tileSize=256
const tileSizePow=8

const maxZoom=19
const initialZoom=17
const initialLat=59.93903
const initialLon=30.31582

const layerNames=[
	['crosshair',`Crosshair`],
	['grid',`Coordinate grid`],
	['zoom',`Zoom buttons`], // TODO this is not a layer
	['attribution',`Attribution`],
]

abstract class MapLayer {
	public readonly $layer:HTMLElement
	constructor(key:string) {
		this.$layer=makeDiv('layer',key)()
	}
	get visible():boolean {
		return this.$layer.style.display!='none'
	}
	hide():void {
		this.$layer.style.display='none'
	}
	show(position:Position,viewSizeX:number,viewSizeY:number):void {
		this.$layer.style.removeProperty('display')
		this.redraw(position,viewSizeX,viewSizeY)
	}
	redraw(position:Position,viewSizeX:number,viewSizeY:number):void {}
}

class TileMapLayer extends MapLayer {
	constructor() {
		super('tiles')
	}
	redraw([x,y,z]:Position,viewSizeX:number,viewSizeY:number) {
		this.$layer.replaceChildren()
		if (!this.visible) return
		const tileX=Math.floor(x/tileSize)
		const tileY=Math.floor(y/tileSize)
		const transX=-x%tileSize
		const transY=-y%tileSize
		const tileRange=Math.pow(2,z)
		const tileMask=tileRange-1
		const nExtraTilesXL=
			Math.floor((viewSizeX/2+transX)/tileSize)+1
		const nExtraTilesXU=
			Math.floor((viewSizeX/2-transX)/tileSize)
		const nExtraTilesYL=Math.min(
			tileY,
			Math.floor((viewSizeY/2+transY)/tileSize)+1
		)
		const nExtraTilesYU=Math.min(
			tileRange-tileY-1,
			Math.floor((viewSizeY/2-transY)/tileSize)
		)
		for (let iTileY=-nExtraTilesYL;iTileY<=nExtraTilesYU;iTileY++) {
			for (let iTileX=-nExtraTilesXL;iTileX<=nExtraTilesXU;iTileX++) {
				const tileUrl=eu`https://tile.openstreetmap.org/${z}/${(tileX+iTileX)&tileMask}/${tileY+iTileY}.png`
				const $img=document.createElement('img')
				$img.src=tileUrl
				$img.style.translate=`${transX+iTileX*tileSize}px ${transY+iTileY*tileSize}px`
				this.$layer.append($img)
			}
		}
	}
}

class CrosshairMapLayer extends MapLayer {
	constructor() {
		super('crosshair')
		this.$layer.innerHTML=`<svg><use href="#map-crosshair" /></svg>`
	}
}

class GridMapLayer extends MapLayer {
	constructor() {
		super('grid')
	}
	redraw([x,y,z]:Position,viewSizeX:number,viewSizeY:number) {
		if (!this.visible) return this.$layer.replaceChildren()
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
		const writeMeshLines=(
			xy:string,
			scaleCoordRange:number,
			coord1:number,
			coord2:number,
			calculatePixel:(coord:number)=>number,
			calculateTextPixelAlong:()=>number,
			calculateTextPixelAcross:(currentPixel:number)=>number
		):void=>{
			const [coordScale,coordStep]=calculateScaleAndStep(scaleCoordRange)
			const coordBase=Math.ceil(coord1/coordStep)*coordStep
			for (let i=0;;i++) {
				const currentCoord=coordBase+i*coordStep
				if (currentCoord>coord2) break
				const currentPixel=calculatePixel(currentCoord)
				svg+=ex`<line ${xy[0]}2="100%" ${xy[1]}1="${currentPixel+0.5}" ${xy[1]}2="${currentPixel+0.5}" />`
				const coordString=currentCoord.toFixed(Math.max(0,-coordScale))
				svg+=ex`<text ${xy[0]}="${calculateTextPixelAlong()}" ${xy[1]}="${calculateTextPixelAcross(currentPixel)}">${coordString}°</text>`
			}
		}
		const textOffset=4
		writeMeshLines(
			'xy',lat1c-lat2c,lat2,lat1,
			lat=>calculateY(z,lat)-y1,
			()=>0.5+textOffset,
			currentPixel=>currentPixel-textOffset
		)
		writeMeshLines(
			'yx',lon2c-lon1c,lon1,lon2,
			lon=>calculateX(z,lon)-x1,
			()=>viewSizeY-0.5-textOffset,
			currentPixel=>currentPixel+textOffset
		)
		svg+=`</svg>`
		this.$layer.innerHTML=svg
	}
}

export default class MapPane {
	private position=calculatePosition(initialZoom,initialLat,initialLon)
	private readonly layers:Map<string,MapLayer>=new Map([
		['tiles',new TileMapLayer],
		['crosshair',new CrosshairMapLayer],
		['grid',new GridMapLayer],
	])
	constructor(private readonly $map: HTMLElement) {
		const $zoomIn=makeButton(`Zoom in`,'zoom-in')
		const $zoomOut=makeButton(`Zoom out`,'zoom-out')
		const $zoomButtons=makeDiv('buttons','controls')($zoomIn,$zoomOut)

		const $surface=makeDiv('surface')()
		$surface.tabIndex=0
		const $attribution=makeDiv('attribution')(
			`© `,makeLink(`OpenStreetMap contributors`,`https://www.openstreetmap.org/copyright`)
		)
		$map.append(
			$zoomButtons,$surface,
			...Array.from(this.layers.values(),layer=>layer.$layer),
			$attribution
		)

		const resizeObserver=new ResizeObserver(()=>this.redrawMap())
		resizeObserver.observe($map)

		const pan=(dx:number,dy:number)=>{
			const [x,y,z]=this.position
			const mask=Math.pow(2,z+tileSizePow)-1
			this.position=[
				(x+dx)&mask,
				Math.min(mask,Math.max(0,(y+dy))),
				z
			]
			this.redrawMap()
		}
		const zoom=(dx:number,dy:number,dz:number)=>{
			let [x,y,z]=this.position
			if (z+dz<0) dz=-z
			if (z+dz>maxZoom) dz=maxZoom-z
			if (dz==0) return
			z+=dz
			const f=Math.pow(2,dz)
			x=Math.floor(f*x+(f-1)*dx)
			y=Math.floor(f*y+(f-1)*dy)
			this.position=[x,y,z]
			this.redrawMap()
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
			this.reportMoveEnd()
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
			this.reportMoveEnd()
		}
		$surface.ondblclick=ev=>{
			mouseZoom(ev,ev.shiftKey?-1:+1)
			this.reportMoveEnd()
		}
		$zoomIn.onclick=()=>{
			zoom(0,0,+1)
			this.reportMoveEnd()
		}
		$zoomOut.onclick=()=>{
			zoom(0,0,-1)
			this.reportMoveEnd()
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
			this.reportMoveEnd()
			ev.stopPropagation()
			ev.preventDefault()
		}
	}
	move(zoom:number,lat:number,lon:number):void {
		const zoom1=Math.min(maxZoom,Math.max(0,zoom))
		const [x,y,z]=calculatePosition(zoom1,lat,lon)
		const mask=Math.pow(2,z+tileSizePow)-1
		const x1=x&mask
		let y1=Math.min(mask,Math.max(0,y))
		this.position=[x1,y1,z]
		if (zoom!=zoom1 || x!=x1 || y!=y1) this.reportMoveEnd()
		this.redrawMap()
	}
	getLayers():[key:string,name:string,value:boolean][] {
		return layerNames.map(([key,name])=>[key,name,true])
	}
	toggleLayer(key:string,value:boolean):void {
		const layer=this.layers.get(key)
		if (!layer) return
		if (value) {
			layer.show(this.position,this.$map.clientWidth,this.$map.clientHeight)
		} else {
			layer.hide()
		}
	}
	private reportMoveEnd() {
		const ev=new CustomEvent<Coordinates>('mapMoveEnd',{
			bubbles: true,
			detail: calculateCoords(...this.position)
		})
		this.$map.dispatchEvent(ev)
	}
	private redrawMap() {
		for (const layer of this.layers.values()) {
			layer.redraw(this.position,this.$map.clientWidth,this.$map.clientHeight)
		}
	}
}

function calculateX(zoom:number,lon:number):number {
	return Math.floor(Math.pow(2,zoom+tileSizePow)*(lon+180)/360)
}
function calculateY(zoom:number,lat:number):number {
	return Math.floor(Math.pow(2,zoom+tileSizePow)*(1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2)
}
function calculatePosition(zoom:number,lat:number,lon:number):Position {
	return [
		calculateX(zoom,lon),
		calculateY(zoom,lat),
		zoom
	]
}

function calculateCoords(x:number,y:number,z:number):Coordinates {
	const n=Math.PI-2*Math.PI*y/Math.pow(2,z+tileSizePow)
	return [
		z,
		180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))),
		x/Math.pow(2,z+tileSizePow)*360-180
	]
}
