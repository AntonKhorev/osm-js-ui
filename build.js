import * as fs from 'fs/promises'
import { rollup } from 'rollup'
import typescript from '@rollup/plugin-typescript'

// remove previous build
await fs.rm('dist',{recursive: true, force: true})
await fs.mkdir('dist')

// copy files
await fs.copyFile('src/index.html','dist/index.html')
await fs.copyFile('src/index.css','dist/index.css')

{
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
