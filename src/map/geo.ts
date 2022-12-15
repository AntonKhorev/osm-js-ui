export type Coordinates = [zoom:number, lat:number, lon:number]
export type Position = [x:number,y:number,z:number]

export const tileSizePow=8
export const tileSize=2**tileSizePow

export function calculateX(zoom:number,lon:number):number {
	const s=2**(zoom+tileSizePow)
	return Math.floor(s*(lon+180)/360)
}
export function calculateY(zoom:number,lat:number):number {
	const maxLat=85.0511287798
	const validLat=Math.max(Math.min(maxLat,lat),-maxLat)
	const s=2**(zoom+tileSizePow)
	return Math.floor(s*(1-Math.log(Math.tan(validLat*Math.PI/180) + 1/Math.cos(validLat*Math.PI/180))/Math.PI)/2)
}
export function calculatePosition(zoom:number,lat:number,lon:number):Position {
	return [
		calculateX(zoom,lon),
		calculateY(zoom,lat),
		zoom
	]
}

export function calculateCoords(x:number,y:number,z:number):Coordinates {
	const s=2**(z+tileSizePow)
	const n=Math.PI-2*Math.PI*y/s
	return [
		z,
		180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))),
		x/s*360-180
	]
}

export function calculateGridScaleAndStep(latOrLonSpan:number):[scale:number,step:number] {
	const testSpan=latOrLonSpan/2 // try to get 3 grid lines
	if (testSpan>20) {
		let scale=20
		for (const tryScale of [30,60,90,180,360]) {
			if (tryScale>testSpan) break
			scale=tryScale
		}
		return [1,scale]
	} else {
		const logSpan=Math.log10(testSpan)
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
}
