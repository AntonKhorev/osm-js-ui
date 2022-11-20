import {makeElement, makeEscapeTag} from './util'

const makeDiv=makeElement('div')

const tileSize=256
const tileSizePow=8

main()

async function main() {
	const e=makeEscapeTag(encodeURIComponent)
	const initialZoom=17
	const initialLat=59.93903
	const initialLon=30.31582
	let position:[x:number,y:number,z:number]=calculatePosition(initialZoom,initialLat,initialLon)
	
	const $zoom=makeElement('input')()()
	$zoom.type='number'
	$zoom.min='0'
	$zoom.max='19'
	$zoom.value=String(initialZoom)
	const $lat=makeElement('input')()()
	$lat.value=String(initialLat)
	const $lon=makeElement('input')()()
	$lon.value=String(initialLon)

	const updateInputs=()=>{
		const [zoom,lat,lon]=calculateCoords(...position)
		$zoom.value=String(zoom)
		$lat.value=String(lat)
		$lon.value=String(lon)
	}

	const $tiles=makeDiv('tiles')()
	const $crosshair=makeDiv('crosshair')()
	const $map=makeDiv('map')($tiles,$crosshair)
	$crosshair.innerHTML=`<svg><use href="#map-crosshair" /></svg>`
	document.body.append(
		makeDiv()(
			makeElement('label')()(`Zoom: `,$zoom),` `,
			makeElement('label')()(`Lat: `,$lat),` `,
			makeElement('label')()(`Lon: `,$lon)
		),
		$map
	)

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

	$zoom.oninput=$lat.oninput=$lon.oninput=()=>{
		position=calculatePosition(
			parseInt($zoom.value,10),
			parseFloat($lat.value),
			parseFloat($lon.value)
		)
		replaceTiles()
	}

	const resizeObserver=new ResizeObserver(replaceTiles)
	resizeObserver.observe($map)

	$map.onmousemove=ev=>{
		if (!(ev.buttons&1)) return
		let [x,y,z]=position
		x-=ev.movementX
		y-=ev.movementY
		position=[x,y,z]
		updateInputs()
		replaceTiles()
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
