import {makeEscapeTag, escapeXml, makeDiv, makeButton, makeLink} from './util'

export type Coordinates = [zoom:number, lat:number, lon:number]
export type Position = [x:number,y:number,z:number]

const eu=makeEscapeTag(encodeURIComponent)
const ex=makeEscapeTag(escapeXml)

const tileSize=256
const tileSizePow=8
const animationCurveParameter=0.002 // [px/ms^2]

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
	private previousPosition?:Position
	private previousTileXL?:number
	private previousTileXU?:number
	private previousTileYL?:number
	private previousTileYU?:number
	constructor() {
		super('tiles')
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

class PanAxisAnimation {
	constructor(
		public startAxisPosition:number,
		public decayAxisDistance:number,
		public decayTotalDistance:number,
		public startTime:number,
		public decayStartTime:number,
		public decayDuration:number
	) {}
	transitionToDecay(time:number):void {
		if (time<this.decayStartTime) {
			this.decayStartTime=time
		}
	}
	isEnded(time:number):boolean {
		return time>=this.decayStartTime+this.decayDuration
	}
	getAxisPosition(time:number):number {
		let linearTime=time-this.startTime
		if (time>this.decayStartTime) {
			linearTime=this.decayStartTime-this.startTime
		}
		let decayRemainingTime=this.decayDuration
		if (time>this.decayStartTime) {
			decayRemainingTime-=(time-this.decayStartTime)
		}
		if (decayRemainingTime<0) {
			decayRemainingTime=0
		}
		const axisDirection=this.decayAxisDistance/this.decayTotalDistance
		return (
			this.startAxisPosition +
			axisDirection*linearTime +
			this.decayAxisDistance-axisDirection*animationCurveParameter*decayRemainingTime**2
		)
	}
}

export default class MapPane {
	private position=calculatePosition(initialZoom,initialLat,initialLon)
	private panAnimationX:PanAxisAnimation|undefined
	private panAnimationY:PanAxisAnimation|undefined
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

		const resizeObserver=new ResizeObserver(()=>this.redrawLayers())
		resizeObserver.observe($map)

		const pan=(dx:number,dy:number)=>{
			const [x,y,z]=this.position
			this.setPosition(x+dx,y+dy,z)
			this.redrawLayers()
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
			this.redrawLayers()
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
			this.stopAnimation()
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
				this.startFlingAnimation(dragSpeedX,dragSpeedY)
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
			this.stopAnimation()
			const dz=-Math.sign(ev.deltaY)
			if (!dz) return
			mouseZoom(ev,dz)
			this.reportMoveEnd()
		}
		$surface.ondblclick=ev=>{
			this.stopAnimation()
			mouseZoom(ev,ev.shiftKey?-1:+1)
			this.reportMoveEnd()
		}
		$zoomIn.onclick=()=>{
			this.stopAnimation()
			zoom(0,0,+1)
			this.reportMoveEnd()
		}
		$zoomOut.onclick=()=>{
			this.stopAnimation()
			zoom(0,0,-1)
			this.reportMoveEnd()
		}

		$surface.onkeydown=ev=>{
			const panStepBase=64
			const multiplier=ev.shiftKey?3:1
			const panStep=panStepBase*multiplier
			const animateArrowKey=(dx:number,dy:number)=>{
				if (ev.repeat) {
					// TODO check if animation is in linear phase, extend it if yes
					this.startConstantSpeedAnimation(dx,dy)
				} else {
					this.startStepAnimation(dx,dy)
				}
			}
			if (ev.key=='ArrowLeft') {
				animateArrowKey(-panStep,0)
			} else if (ev.key=='ArrowRight') {
				animateArrowKey(+panStep,0)
			} else if (ev.key=='ArrowUp') {
				animateArrowKey(0,-panStep)
			} else if (ev.key=='ArrowDown') {
				animateArrowKey(0,+panStep)
			} else if (ev.key=='+') {
				this.stopAnimation()
				zoom(0,0,+multiplier)
				this.reportMoveEnd()
			} else if (ev.key=='-') {
				this.stopAnimation()
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
				if (this.panAnimationX) {
					this.panAnimationX.transitionToDecay(time)
				}
			} else if (ev.key=='ArrowUp' || ev.key=='ArrowDown') {
				if (this.panAnimationY) {
					this.panAnimationY.transitionToDecay(time)
				}
			}
		}
	}
	move(zoom:number,lat:number,lon:number):void {
		this.stopAnimation()
		const zoom1=Math.min(maxZoom,Math.max(0,zoom))
		this.setPosition(...calculatePosition(zoom1,lat,lon))
		this.reportMoveEnd()
		this.redrawLayers()
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
	private startConstantSpeedAnimation(dx:number,dy:number) {
		const dp=Math.sqrt(dx**2+dy**2)
		const dt=Math.sqrt(dp/animationCurveParameter)
		this.startAnimation(dx,dy,dp,dt,1000)
	}
	private startStepAnimation(dx:number,dy:number) {
		const dp=Math.sqrt(dx**2+dy**2)
		const dt=Math.sqrt(dp/animationCurveParameter)
		this.startAnimation(dx,dy,dp,dt)
	}
	private startFlingAnimation(speedX:number,speedY:number) {
		const speed=Math.sqrt(speedX**2+speedY**2)
		const dt=speed/(2*animationCurveParameter)
		const dp=animationCurveParameter*dt**2
		const dragStepThreshold=32 // [px]
		if (dp<dragStepThreshold) {
			this.reportMoveEnd()
		} else {
			const dx=dp*speedX/speed
			const dy=dp*speedY/speed
			this.startAnimation(dx,dy,dp,dt)
		}
	}
	private startAnimation(dx:number,dy:number,dp:number,decayDuration:number,constantSpeedPhaseDuration:number=0) {
		const [x0,y0]=this.position
		const startTime=performance.now()
		if (dx) {
			this.panAnimationX=new PanAxisAnimation(
				x0,dx,dp,
				startTime,startTime+constantSpeedPhaseDuration,decayDuration
			)
		} else {
			this.panAnimationX=undefined
		}
		if (dy) {
			this.panAnimationY=new PanAxisAnimation(
				y0,dy,dp,
				startTime,startTime+constantSpeedPhaseDuration,decayDuration
			)
		} else {
			this.panAnimationY=undefined
		}
		const animateFrame=(time:number)=>{
			let [x,y,z]=this.position
			if (this.panAnimationX) {
				x=this.panAnimationX.getAxisPosition(time)
				if (this.panAnimationX.isEnded(time)) {
					this.panAnimationX=undefined
				}
			}
			if (this.panAnimationY) {
				y=this.panAnimationY.getAxisPosition(time)
				if (this.panAnimationY.isEnded(time)) {
					this.panAnimationY=undefined
				}
			}
			this.setPosition(x,y,z)
			this.redrawLayers()
			if (this.panAnimationX || this.panAnimationY) {
				requestAnimationFrame(animateFrame)
			} else {
				this.reportMoveEnd()
			}
		}
		requestAnimationFrame(animateFrame)
	}
	private stopAnimation() {
		this.panAnimationX=undefined
		this.panAnimationY=undefined
	}
	private reportMoveEnd() {
		const ev=new CustomEvent<Coordinates>('osmJsUi:mapMoveEnd',{
			bubbles: true,
			detail: calculateCoords(...this.position)
		})
		this.$map.dispatchEvent(ev)
	}
	private redrawLayers() {
		for (const layer of this.layers.values()) {
			layer.redraw(this.position,this.$map.clientWidth,this.$map.clientHeight)
		}
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
