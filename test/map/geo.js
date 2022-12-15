import {strict as assert} from 'assert'
import {calculateY, calculateGridScaleAndStep} from '../../test-build/map/geo.js'

describe("map/geo module",()=>{
	it("makes 60deg longitude grid on low zooms",()=>{
		const result=calculateGridScaleAndStep(170)
		assert.deepEqual(result,[1,60])
	})
	it("clamps y position when lat above max valid value",()=>{
		const y=calculateY(0,86)
		assert.equal(y,0)
	})
	it("clamps y position when lat below min valid value",()=>{
		const y=calculateY(0,-86)
		assert.equal(y,255)
	})
})
