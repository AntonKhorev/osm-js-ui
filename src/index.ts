import {makeElement, makeEscapeTag} from './util'

const makeDiv=makeElement('div')

main()

async function main() {
	const e=makeEscapeTag(encodeURIComponent)
	const tileSizeX=256
	const tileSizeY=256
	const zoom=17
	const lat=59.93903
	const lon=30.31582
	let position:[x:number,y:number,z:number]=calculatePosition(zoom,lat,lon)
	
	const $zoom=makeElement('input')()()
	$zoom.type='number'
	$zoom.min='0'
	$zoom.max='19'
	$zoom.value=String(zoom)
	const $tiles=makeDiv('tiles')()
	const $crosshair=makeDiv('crosshair')()
	const $map=makeDiv('map')($tiles,$crosshair)
	$crosshair.innerHTML=`<svg><use href="#map-crosshair" /></svg>`
	document.body.append(
		makeDiv('input')(makeElement('label')()(`Zoom: `,$zoom)),
		$map
	)

	const replaceTiles=()=>{
		$tiles.innerHTML=''
		const [x,y,z]=position
		const tileX=Math.floor(x)
		const tileY=Math.floor(y)
		const pixelX=Math.floor(x*tileSizeX)
		const pixelY=Math.floor(y*tileSizeY)
		const transX=-pixelX%tileSizeX
		const transY=-pixelY%tileSizeY
		const viewHalfSizeX=$map.clientWidth/2
		const viewHalfSizeY=$map.clientHeight/2
		const tileRange=Math.pow(2,z)
		const tileMask=tileRange-1
		const nExtraTilesXL=
			Math.floor((viewHalfSizeX+transX)/tileSizeX)+1
		const nExtraTilesXU=
			Math.floor((viewHalfSizeX-transX)/tileSizeX)
		const nExtraTilesYL=Math.min(
			tileY,
			Math.floor((viewHalfSizeY+transY)/tileSizeY)+1
		)
		const nExtraTilesYU=Math.min(
			tileRange-tileY-1,
			Math.floor((viewHalfSizeY-transY)/tileSizeY)
		)
		for (let iTileY=-nExtraTilesYL;iTileY<=nExtraTilesYU;iTileY++) {
			for (let iTileX=-nExtraTilesXL;iTileX<=nExtraTilesXU;iTileX++) {
				const tileUrl=e`https://tile.openstreetmap.org/${z}/${(tileX+iTileX)&tileMask}/${tileY+iTileY}.png`
				const $img=document.createElement('img')
				$img.src=tileUrl
				$img.style.translate=`${transX+iTileX*tileSizeX}px ${transY+iTileY*tileSizeY}px`
				$tiles.append($img)
			}
		}
	}
	$zoom.oninput=()=>{
		position=calculatePosition(Number($zoom.value),lat,lon)
		replaceTiles()
	}
	const resizeObserver=new ResizeObserver(replaceTiles)
	resizeObserver.observe($map)
}

function calculatePosition(zoom:number,lat:number,lon:number):[x:number,y:number,z:number] {
	return [
		(lon+180)/360*Math.pow(2,zoom),
		(1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2*Math.pow(2,zoom),
		zoom
	]
}
