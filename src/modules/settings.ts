import Module from '../module'
import Map from '../map'
import {Content, makeElement} from '../util'

export default class SettingsModule extends Module {
	constructor(private map:Map) {
		super()
	}
	makeHeading():Content {
		return [`Settings`]
	}
	makeContent():Content {
		const content:Content=[
			makeElement('h2')()(`Map layers`)
		]
		for (const [key,name,value] of this.map.getLayers()) {
			const $layerCheckbox=document.createElement('input')
			$layerCheckbox.type='checkbox'
			$layerCheckbox.checked=value
			makeElement('label')()($layerCheckbox,name)
		}
		return content
	}
}
