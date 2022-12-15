import {strict as assert} from 'assert'
import {calculateGridScaleAndStep} from '../../test-build/map/geo.js'

describe("map/geo module",()=>{
	it("makes 60deg longitude grid on low zooms",()=>{
		const result=calculateGridScaleAndStep(170)
		assert.deepEqual(result,[1,60])
	})
})
