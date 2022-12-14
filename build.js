import * as fs from 'fs/promises'
import { rollup } from 'rollup'
import typescript from '@rollup/plugin-typescript'

{
	// remove previous build; don't remove dist dir to be more live-server-friendly
	await fs.mkdir('dist',{recursive: true})
	for (const filename of await fs.readdir('dist')) {
		await fs.rm(`dist/${filename}`,{recursive: true, force: true})
	}
}{
	// process svgs
	let embeddedStyles=''
	let embeddedSymbols=''
	for (const dirEntry of await fs.readdir('src/svg',{withFileTypes:true})) {
		if (dirEntry.isDirectory()) continue
		const filename=dirEntry.name
		if (filename=='favicon.svg') continue
		const [style,symbol]=getEmbeddedSvg(
			filename.split('.')[0],
			await fs.readFile(`src/svg/${filename}`,'utf-8')
		)
		embeddedStyles+=style
		embeddedSymbols+=symbol
	}

	// build index with embedded svgs
	const embeddedSvgs=
		`<svg class="symbols">\n`+
		`<style>\n`+
		embeddedStyles+
		`</style>\n`+
		embeddedSymbols+
		`</svg>`
	// const favicon=await fs.readFile(`src/svg/favicon.svg`,'utf-8')
	// const encodedFavicon=Buffer.from(favicon).toString('base64')
	const htmlContents=await fs.readFile('src/index.html','utf-8')
	const patchedHtmlContents=htmlContents
		.replace(`<body>`,`<body data-build="${new Date().toISOString()}">`)
		.replace(`<!-- {embed svgs} -->`,embeddedSvgs)
		// .replace(`<!-- {embed favicon} -->`,`<link rel=icon href="data:image/svg+xml;charset=utf-8;base64,${encodedFavicon}">`)
	await fs.writeFile('dist/index.html',patchedHtmlContents)
}{
	// copy css
	await fs.copyFile('src/index.css','dist/index.css')
}{
	// compile and bundle scripts
	const bundle=await rollup({
		input: 'src/index.ts',
		plugins: [typescript()]
	})
	bundle.write({
		file: "dist/index.js",
	})
	bundle.close()
}

function getEmbeddedSvg(id,input) {
	let style=''
	let symbol=''
	for (const line of input.split(/\r?\n/)) {
		let match
		if (match=line.match(/^<svg.*(viewBox="[^"]*").*>$/)) {
			const [,viewBox]=match
			symbol+=`<symbol id="${id}" ${viewBox}>\n`
		} else if (match=line.match(/^<\/svg>$/)) {
			symbol+=`</symbol>\n`
			break
		} else if (match=line.match(/^<g class="([^"]*)"/)) {
			const [,partClass]=match
			const visibility=(partClass=='default'?'visible':'hidden')
			style+=`#${id} .${partClass} { visibility: var(--${id}-${partClass}-part-visibility,${visibility}); }\n`
			symbol+=line+'\n'
		} else {
			symbol+=line+'\n'
		}
	}
	return [style,symbol]
}
