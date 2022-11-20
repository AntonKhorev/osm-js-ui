import {makeElement, makeEscapeTag} from './util'

const makeDiv=makeElement('div')

main()

async function main() {
	const $tiles=makeDiv('tiles')()
	const $crosshair=makeDiv('crosshair')()
	const $map=makeDiv('map')($tiles,$crosshair)

	$crosshair.innerHTML=`<svg><use href="#map-crosshair" /></svg>`
	document.body.append($map)

	const e=makeEscapeTag(encodeURIComponent)
	const tileSizeX=256
	const tileSizeY=256
	const zoom=17
	const lat=59.93903
	const lon=30.31582
	const x=lon2x(lon,zoom)
	const y=lat2y(lat,zoom)
	const tileX=Math.floor(x)
	const tileY=Math.floor(y)
	const pixelX=Math.floor(x*tileSizeX)
	const pixelY=Math.floor(y*tileSizeY)
	// const transX=$map.clientWidth/2-pixelX%tileSizeX
	// const transY=$map.clientHeight/2-pixelY%tileSizeY
	const transX=-pixelX%tileSizeX
	const transY=-pixelY%tileSizeY
	const tileUrl=e`https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`
	const $img=document.createElement('img')
	$img.src=tileUrl
	$img.style.translate=`${transX}px ${transY}px`
	$tiles.append($img)

	function lat2y(lat:number,zoom:number):number {
		return (1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2*Math.pow(2,zoom)
	}
	function lon2x(lon:number,zoom:number):number {
		return (lon+180)/360*Math.pow(2,zoom)
	}
}
