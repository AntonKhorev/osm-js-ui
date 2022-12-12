import {Position, tileSize, calculateCoords, calculateX, calculateY} from './geo'
import {makeDiv} from './html'
import {makeEscapeTag, escapeXml} from './escape'

const eu=makeEscapeTag(encodeURIComponent)
const ex=makeEscapeTag(escapeXml)

export interface OptionalUiElement {
	readonly key:string
	readonly name:string
	get visible():boolean
	hide():void
	show(position:Position,viewSizeX:number,viewSizeY:number):void
}

export const makeSimpleOptionalUiElement=(key:string,name:string,$element:HTMLElement):()=>OptionalUiElement=>()=>({
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

export class CrosshairMapLayer extends MapLayer {
	constructor() {
		super('crosshair',`Crosshair`)
		this.$layer.innerHTML=`<svg><use href="#map-crosshair" /></svg>`
	}
}

export class PositionalMapLayerGroup {
	tileLayer=new TileMapLayer
	gridLayer=new GridMapLayer
	private crossFade:{
		outTileLayer:TileMapLayer
		outGridLayer:TileMapLayer
		offsetX:number
		offsetY:number
	}|undefined
	readonly $layerGroup=makeDiv()(this.tileLayer.$layer,this.gridLayer.$layer)
	redraw(position:Position,viewSizeX:number,viewSizeY:number):void {
		if (this.crossFade) {
			const [x,y,z]=position
			const outPosition:Position=[
				x+this.crossFade.offsetX,
				y+this.crossFade.offsetY,
				z
			]
			this.crossFade.outTileLayer.redraw(outPosition,viewSizeX,viewSizeY)
			this.crossFade.outGridLayer.redraw(outPosition,viewSizeX,viewSizeY)
		}
		this.tileLayer.redraw(position,viewSizeX,viewSizeY)
		this.gridLayer.redraw(position,viewSizeX,viewSizeY)
	}
	startCrossFade(offsetX:number,offsetY:number):void {
		this.setCrossFadeProgress(1)
		this.crossFade={
			outTileLayer:this.tileLayer,
			outGridLayer:this.gridLayer,
			offsetX,offsetY
		}
		this.tileLayer=new TileMapLayer
		this.gridLayer=new GridMapLayer
		if (!this.crossFade.outGridLayer.visible) {
			this.gridLayer.hide()
		}
		this.setCrossFadeOpacity(0)
		this.$layerGroup.append(this.tileLayer.$layer,this.gridLayer.$layer)
	}
	setCrossFadeProgress(progress:number):void {
		if (!this.crossFade) return
		this.setCrossFadeOpacity(progress)
		if (progress>=1) {
			this.crossFade.outTileLayer.$layer.remove()
			this.crossFade.outGridLayer.$layer.remove()
			this.crossFade=undefined
		}
	}
	private setCrossFadeOpacity(progress:number):void {
		if (progress>=1) {
			this.tileLayer.$layer.style.removeProperty('opacity')
			this.gridLayer.$layer.style.removeProperty('opacity')
		} else {
			this.tileLayer.$layer.style.opacity=String(progress)
			this.gridLayer.$layer.style.opacity=String(progress)
		}
	}
}
