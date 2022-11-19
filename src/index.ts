main()

async function main() {
	const $map=document.createElement('div')
	$map.classList.add('map')
	const $crosshair=document.createElement('div')
	$crosshair.classList.add('crosshair')
	$crosshair.innerHTML=`<svg><use href="#map-crosshair" /></svg>`
	$map.append($crosshair)
	document.body.append($map)
}
