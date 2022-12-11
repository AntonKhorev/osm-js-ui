import Animation from './animation'
import {makeEscapeTag, escapeXml} from './escape'
import {makeDiv, makeButton, makeLink} from './html'

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

interface OptionalUiElement {
	readonly key:string
	readonly name:string
	get visible():boolean
	hide():void
	show(position:Position,viewSizeX:number,viewSizeY:number):void
}

const makeSimpleOptionalUiElement=(key:string,name:string,$element:HTMLElement):OptionalUiElement=>({
	key,name,
	get visible() { return $element.style.display!='none' },
	hide() { $element.style.display='none' },
	show() { $element.style.removeProperty('display') },
})

abstract class MapLayer implements OptionalUiElement {
	readonly $layer:HTMLElement
	readonly key:string
	readonly name:string
	constructor(key:string,name:string) {
		this.key=key
		this.name=name
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
	private previousPosition?:Position
	private previousTileXL?:number
	private previousTileXU?:number
	private previousTileYL?:number
	private previousTileYU?:number
	constructor() {
		super('tiles',`Map tiles`)
	}
	redraw(position:Position,viewSizeX:number,viewSizeY:number) {
		if (!this.visible) {
			this.previousPosition=undefined
			this.previousTileXL=this.previousTileXU=undefined
			this.previousTileYL=this.previousTileYU=undefined
			return this.$layer.replaceChildren()
		}
		const [x,y,z]=position
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
		if (
			this.previousPosition==null || this.previousPosition[2]!=z ||
			this.previousTileXL!=tileX-nExtraTilesXL || this.previousTileXU!=tileX+nExtraTilesXU ||
			this.previousTileYL!=tileY-nExtraTilesYL || this.previousTileYU!=tileX+nExtraTilesYU
		) {
			this.$layer.replaceChildren()
			this.$layer.style.removeProperty('translate')
			for (let iTileY=-nExtraTilesYL;iTileY<=nExtraTilesYU;iTileY++) {
				for (let iTileX=-nExtraTilesXL;iTileX<=nExtraTilesXU;iTileX++) {
					const tileUrl=eu`https://tile.openstreetmap.org/${z}/${(tileX+iTileX)&tileMask}/${tileY+iTileY}.png`
					const $img=document.createElement('img')
					$img.src=tileUrl
					$img.style.translate=`${transX+iTileX*tileSize}px ${transY+iTileY*tileSize}px`
					this.$layer.append($img)
				}
			}
			this.previousPosition=position
			this.previousTileXL=tileX-nExtraTilesXL
			this.previousTileXU=tileX+nExtraTilesXU
			this.previousTileYL=tileY-nExtraTilesYL
			this.previousTileYU=tileX+nExtraTilesYU
		} else {
			const [px,py]=this.previousPosition
			this.$layer.style.translate=`${px-x}px ${py-y}px`
		}
	}
}

class GridMapLayer extends MapLayer {
	constructor() {
		super('grid',`Coordinate grid`)
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

class CrosshairMapLayer extends MapLayer {
	constructor() {
		super('crosshair',`Crosshair`)
		this.$layer.innerHTML=`<svg><use href="#map-crosshair" /></svg>`
	}
}

export default class MapPane {
	private position=calculatePosition(initialZoom,initialLat,initialLon)

	private panAnimation:Animation=new Animation(
		()=>{
			const [x,y]=this.position
			return [x,y]
		},
		(x,y)=>{
			const [,,z]=this.position
			this.setPosition(x,y,z)
			this.redraw()
		},
		()=>{
			this.reportMoveEnd()
		}
	)
	
	private readonly tileLayer=new TileMapLayer
	private readonly gridLayer=new GridMapLayer
	private readonly crosshairLayer=new CrosshairMapLayer
	private readonly $zoomIn=makeButton(`Zoom in`,'zoom-in')
	private readonly $zoomOut=makeButton(`Zoom out`,'zoom-out')
	private readonly $zoomButtons=makeDiv('buttons','controls')(this.$zoomIn,this.$zoomOut)
	private readonly $attribution=makeDiv('attribution')(
		`© `,makeLink(`OpenStreetMap contributors`,`https://www.openstreetmap.org/copyright`)
	)
	private readonly optionalUiElements:Map<string,OptionalUiElement>=new Map([
		this.gridLayer,
		this.crosshairLayer,
		makeSimpleOptionalUiElement('zoom',`Zoom buttons`,this.$zoomButtons),
		makeSimpleOptionalUiElement('attribution',`Attribution`,this.$attribution),
	].map(oue=>[oue.key,oue]))
	constructor(private readonly $map: HTMLElement) {
		const $surface=makeDiv('surface')()
		$surface.tabIndex=0
		$map.append(
			this.$zoomButtons,$surface,
			this.tileLayer.$layer,this.gridLayer.$layer,this.crosshairLayer.$layer,
			this.$attribution
		)

		const resizeObserver=new ResizeObserver(()=>this.redraw())
		resizeObserver.observe($map)

		const pan=(dx:number,dy:number)=>{
			const [x,y,z]=this.position
			this.setPosition(x+dx,y+dy,z)
			this.redraw()
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
			this.redraw()
		}
		const mouseZoom=(ev:MouseEvent,dz:number)=>{
			const viewHalfSizeX=$map.clientWidth/2
			const viewHalfSizeY=$map.clientHeight/2
			const dx=ev.offsetX-viewHalfSizeX
			const dy=ev.offsetY-viewHalfSizeY
			zoom(dx,dy,dz)
		}

		let dragTime:number|undefined
		let dragX:number|undefined
		let dragY:number|undefined
		let dragSpeedX:number|undefined
		let dragSpeedY:number|undefined
		const updateDragKinetics=(dx:number,dy:number)=>{
			if (dragTime==null) return
			if (dragSpeedX==null || dragSpeedY==null) return
			const t=performance.now()
			const dt=t-dragTime
			const decayRate=0.003
			const decay=Math.exp(-decayRate*dt)
			dragSpeedX=dragSpeedX*decay+dx/dt*(1-decay)
			dragSpeedY=dragSpeedY*decay+dy/dt*(1-decay)
			dragTime=t
		}
		$surface.onpointerdown=ev=>{
			this.panAnimation.stop()
			dragTime=performance.now()
			dragX=ev.clientX
			dragY=ev.clientY
			dragSpeedX=dragSpeedY=0
			$surface.setPointerCapture(ev.pointerId)
			$surface.classList.add('grabbed')
		}
		$surface.onpointerup=ev=>{
			$surface.classList.remove('grabbed')
			$surface.releasePointerCapture(ev.pointerId)
			updateDragKinetics(0,0)
			if (dragSpeedX && dragSpeedY) {
				this.panAnimation.fling(dragSpeedX,dragSpeedY)
			} else {
				this.reportMoveEnd()
			}
			dragTime=undefined
			dragX=dragY=undefined
			dragSpeedX=dragSpeedY=undefined
		}
		$surface.onpointermove=ev=>{
			if (dragX==null || dragY==null) return
			const dx=dragX-ev.clientX
			const dy=dragY-ev.clientY
			pan(dx,dy)
			dragX=ev.clientX
			dragY=ev.clientY
			updateDragKinetics(dx,dy)
		}

		$surface.onwheel=ev=>{
			this.panAnimation.stop()
			const dz=-Math.sign(ev.deltaY)
			if (!dz) return
			mouseZoom(ev,dz)
			this.reportMoveEnd()
		}
		$surface.ondblclick=ev=>{
			this.panAnimation.stop()
			mouseZoom(ev,ev.shiftKey?-1:+1)
			this.reportMoveEnd()
		}
		this.$zoomIn.onclick=()=>{
			this.panAnimation.stop()
			zoom(0,0,+1)
			this.reportMoveEnd()
		}
		this.$zoomOut.onclick=()=>{
			this.panAnimation.stop()
			zoom(0,0,-1)
			this.reportMoveEnd()
		}

		$surface.onkeydown=ev=>{
			const panStepBase=64
			const multiplier=ev.shiftKey?3:1
			const panStep=panStepBase*multiplier
			const animateArrowKeyX=(dx:number)=>{
				if (ev.repeat) {
					this.panAnimation.linearStepX(dx,1000)
				} else {
					this.panAnimation.stepX(dx)
				}
			}
			const animateArrowKeyY=(dy:number)=>{
				if (ev.repeat) {
					this.panAnimation.linearStepY(dy,1000)
				} else {
					this.panAnimation.stepY(dy)
				}
			}
			if (ev.key=='ArrowLeft') {
				animateArrowKeyX(-panStep)
			} else if (ev.key=='ArrowRight') {
				animateArrowKeyX(+panStep)
			} else if (ev.key=='ArrowUp') {
				animateArrowKeyY(-panStep)
			} else if (ev.key=='ArrowDown') {
				animateArrowKeyY(+panStep)
			} else if (ev.key=='+') {
				this.panAnimation.stop()
				zoom(0,0,+multiplier)
				this.reportMoveEnd()
			} else if (ev.key=='-') {
				this.panAnimation.stop()
				zoom(0,0,-multiplier)
				this.reportMoveEnd()
			} else {
				return
			}
			ev.stopPropagation()
			ev.preventDefault()
		}

		$surface.onkeyup=ev=>{
			const time=performance.now()
			if (ev.key=='ArrowLeft' || ev.key=='ArrowRight') {
				if (this.panAnimation.xAxis) {
					this.panAnimation.xAxis.transitionToDecay(time)
				}
			} else if (ev.key=='ArrowUp' || ev.key=='ArrowDown') {
				if (this.panAnimation.yAxis) {
					this.panAnimation.yAxis.transitionToDecay(time)
				}
			}
		}
	}
	move(zoom:number,lat:number,lon:number):void {
		const [,,currentZoom]=this.position
		const targetZoom=Math.min(maxZoom,Math.max(0,zoom))
		const targetPosition=calculatePosition(targetZoom,lat,lon)
		if (currentZoom==targetZoom) {
			const [x,y]=targetPosition
			this.panAnimation.stepTo(x,y)
		} else {
			this.panAnimation.stop()
			this.setPosition(...targetPosition)
			this.redraw()
			this.reportMoveEnd()
		}
	}
	listOptionalUiElements():[key:string,name:string,isVisible:boolean][] {
		return [...this.optionalUiElements.values()].map(oue=>[oue.key,oue.name,oue.visible])
	}
	toggleOptionalUiElement(key:string,isVisible:boolean):void {
		const oue=this.optionalUiElements.get(key)
		if (!oue) return
		if (isVisible) {
			oue.show(this.position,this.$map.clientWidth,this.$map.clientHeight)
		} else {
			oue.hide()
		}
	}
	private reportMoveEnd() {
		const ev=new CustomEvent<Coordinates>('osmJsUi:mapMoveEnd',{
			bubbles: true,
			detail: calculateCoords(...this.position)
		})
		this.$map.dispatchEvent(ev)
	}
	private redraw() {
		this.tileLayer.redraw(this.position,this.$map.clientWidth,this.$map.clientHeight)
		this.gridLayer.redraw(this.position,this.$map.clientWidth,this.$map.clientHeight)
		const [,,z]=this.position
		this.$zoomOut.disabled=z<=0
		this.$zoomIn.disabled=z>=maxZoom
	}
	private setPosition(x:number,y:number,z:number) {
		const mask=Math.pow(2,z+tileSizePow)-1
		this.position=[
			x&mask,
			Math.min(mask,Math.max(0,y)),
			z
		]
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
