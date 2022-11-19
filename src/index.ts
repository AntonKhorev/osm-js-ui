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
	const zoom=17
	const lat=59.93903
	const lon=30.31582
	const x=lon2tile(lon,zoom)
	const y=lat2tile(lat,zoom)
	const tileUrl=e`https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`
	const $img=document.createElement('img')
	$img.src=tileUrl
	$tiles.append($img)

	function lat2tile(lat:number,zoom:number):number {
		return Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2*Math.pow(2,zoom))
	}
	function lon2tile(lon:number,zoom:number):number {
		return Math.floor((lon+180)/360*Math.pow(2,zoom))
	}
}
