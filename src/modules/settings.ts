import Module from '../module'
import MapPane from '../map'
import {Content, makeElement, makeDiv} from '../html'

export default class SettingsModule extends Module {
	constructor(private map:MapPane) {
		super()
	}
	makeHeading():Content {
		return [`Settings`]
	}
	makeContent():Content {
		const content:Content=[
			makeElement('h2')()(`Map layers`)
		]
		for (const [key,name,value] of this.map.listOptionalUiElements()) {
			const $layerCheckbox=document.createElement('input')
			$layerCheckbox.type='checkbox'
			$layerCheckbox.checked=value
			$layerCheckbox.oninput=()=>{
				this.map.toggleOptionalUiElement(key,$layerCheckbox.checked)
			}
			content.push(makeDiv()(
				makeElement('label')()($layerCheckbox,name)
			))
		}
		return content
	}
}
