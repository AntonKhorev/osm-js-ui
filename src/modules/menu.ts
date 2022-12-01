import Module from '../module'
import {Content, makeElement, makeLink} from '../util'

export default class MenuModule extends Module {
	makeHeading():Content {
		return [`Menu`]
	}
	makeContent():Content {
		const modules:[key:string,name:string][]=[
			['settings',`Settings`],
			['test',`Test`],
		]
		return [makeElement('ul')()(
			...modules.map(([key,name])=>makeElement('li')()(
				makeLink(name,`#module=${key}`)
			))
		)]
	}
}
