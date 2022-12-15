import * as fs from 'fs/promises'
import { rollup } from 'rollup'
import typescript from '@rollup/plugin-typescript'

// compile and bundle scripts to be tested
const input=[]
const scanTestDirectory=async(subpath='')=>{
	for (const testDirEntry of await fs.readdir(`test${subpath}`,{withFileTypes:true})) {
		if (testDirEntry.isDirectory()) {
			await scanTestDirectory('/'+testDirEntry.name)
		} else {
			const filename=testDirEntry.name
			const match=filename.match(/^(.*)\.js$/)
			if (!match) continue
			const [,script]=match
			input.push(`src${subpath}/${script}.ts`)
		}
	}
}
await scanTestDirectory()
const bundle=await rollup({
	input,
	plugins: [typescript()]
})
bundle.write({
	dir: `test-build`
})
bundle.close()
