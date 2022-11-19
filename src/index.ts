main()

async function main() {
	const $map=document.createElement('div')
	$map.classList.add('map')
	const $crosshair=document.createElement('div')
	$crosshair.classList.add('crosshair')
	$crosshair.innerHTML=`<svg><use href="#map-crosshair" /></svg>`
	$map.append($crosshair)
	document.body.append($map)

	const e=makeEscapeTag(encodeURIComponent)
	const zoom=17
	const lat=59.93879
	const lon=30.31580
	const x=lon2tile(lon,zoom)
	const y=lat2tile(lat,zoom)
	const tileUrl=e`https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`
	console.log(`tileUrl`,tileUrl)

	function lat2tile(lat:number,zoom:number):number {
		return Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2*Math.pow(2,zoom))
	}
	function lon2tile(lon:number,zoom:number):number {
		return Math.floor((lon+180)/360*Math.pow(2,zoom))
	}
}

function makeEscapeTag(escapeFn: (text: string) => string): (strings: TemplateStringsArray, ...values: unknown[]) => string {
	return function(strings: TemplateStringsArray, ...values: unknown[]): string {
		let result=strings[0]
		for (let i=0;i<values.length;i++) {
			result+=escapeFn(String(values[i]))+strings[i+1]
		}
		return result
	}
}
