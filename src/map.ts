import Drag from './map/drag'
import Animation from './map/animation'
import {
	OptionalUiElement, makeSimpleOptionalUiElement,
	CrosshairMapLayer, PositionalMapLayerGroup
} from './map/layer'
import {makeDiv, makeButton, makeLink} from './html'
import {Coordinates, tileSizePow, calculatePosition, calculateCoords} from './map/geo'

const maxZoom=19
const initialZoom=17
const initialLat=59.93903
const initialLon=30.31582

export default class MapPane {
	private position=calculatePosition(initialZoom,initialLat,initialLon)
	private readonly positionalLayerGroup=new PositionalMapLayerGroup
	private readonly crosshairLayer=new CrosshairMapLayer

	private panAnimation:Animation=new Animation(
		()=>{
			const [x,y]=this.position
			return [x,y]
		},
		(crossFadeProgress)=>{
			this.positionalLayerGroup.setCrossFadeProgress(crossFadeProgress)
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
	
	private readonly $zoomIn=makeButton(`Zoom in`,'zoom-in')
	private readonly $zoomOut=makeButton(`Zoom out`,'zoom-out')
	private readonly $zoomButtons=makeDiv('buttons','controls')(this.$zoomIn,this.$zoomOut)
	private readonly $attribution=makeDiv('attribution')(
		`© `,makeLink(`OpenStreetMap contributors`,`https://www.openstreetmap.org/copyright`)
	)
	private readonly optionalUiElements:Map<string,()=>OptionalUiElement>=new Map([
		()=>this.positionalLayerGroup.gridLayer,
		()=>this.crosshairLayer,
		makeSimpleOptionalUiElement('zoom',`Zoom buttons`,this.$zoomButtons),
		makeSimpleOptionalUiElement('attribution',`Attribution`,this.$attribution),
	].map(getOue=>[getOue().key,getOue]))
	constructor(private readonly $map: HTMLElement) {
		const $surface=makeDiv('surface')()
		$surface.tabIndex=0
		$map.append(
			this.$zoomButtons,$surface,
			this.positionalLayerGroup.$layerGroup,
			this.crosshairLayer.$layer,this.$attribution
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

		let drag:Drag|undefined
		$surface.onpointerdown=ev=>{
			// TODO:
			// if ev.isPrimary: start drag
			// else if drag ongoing: start pinch
			// else if pinch ongoing: ignore
			this.panAnimation.stop()
			drag=new Drag(ev.clientX,ev.clientY,performance.now())
			$surface.setPointerCapture(ev.pointerId)
			$surface.classList.add('grabbed')
		}
		$surface.onpointerup=$surface.onpointercancel=ev=>{
			$surface.classList.remove('grabbed')
			if (!drag) return
			drag.update(ev.clientX,ev.clientY,performance.now())
			if (drag.isMoving) {
				this.panAnimation.fling(drag.speedX,drag.speedY)
			} else {
				this.reportMoveEnd()
			}
			drag=undefined
		}
		$surface.onpointermove=ev=>{
			if (!drag) return
			pan(drag.x-ev.clientX,drag.y-ev.clientY)
			drag.update(ev.clientX,ev.clientY,performance.now())
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
		const [x1,y1,currentZoom]=this.position
		const targetZoom=Math.min(maxZoom,Math.max(0,zoom))
		const targetPosition=calculatePosition(targetZoom,lat,lon)
		if (currentZoom==targetZoom) {
			let [x2,y2]=targetPosition
			const spaceSize=Math.pow(2,currentZoom+tileSizePow)
			if (x1<x2) {
				const x2w=x2-spaceSize
				if (x1-x2w<x2-x1) x2=x2w
			} else if (x1>x2) {
				const x2w=x2+spaceSize
				if (x2w-x1<x1-x2) x2=x2w
			}
			const crossFadeOffset=this.panAnimation.move(x2,y2)
			if (crossFadeOffset) {
				this.positionalLayerGroup.startCrossFade(...crossFadeOffset)
			}
		} else {
			this.panAnimation.stop()
			this.setPosition(...targetPosition)
			this.redraw()
			this.reportMoveEnd()
		}
	}
	listOptionalUiElements():[key:string,name:string,isVisible:boolean][] {
		return [...this.optionalUiElements.values()].map(getOue=>{
			const oue=getOue()
			return [oue.key,oue.name,oue.visible]
		})
	}
	toggleOptionalUiElement(key:string,isVisible:boolean):void {
		const oue=this.optionalUiElements.get(key)?.()
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
		this.positionalLayerGroup.redraw(this.position,this.$map.clientWidth,this.$map.clientHeight)
		const [,,z]=this.position
		this.$zoomOut.disabled=z<=0
		this.$zoomIn.disabled=z>=maxZoom
	}
	private setPosition(x:number,y:number,z:number) {
		const mask=Math.pow(2,z+tileSizePow)-1
		this.position=[
			x&mask,
			Math.min(mask,Math.max(0,Math.round(y))),
			z
		]
	}
}
