import Module from '../module'
import {Content, makeElement} from '../util'

export default class MenuModule extends Module {
	makeHeading():Content {
		return [`Menu`]
	}
	makeContent():Content {
		const modules:[key:string,name:string][]=[
			['settings',`Settings`],
			['test',`Test`],
		]
		const $menuEntries=modules.map(([key,name])=>{
			const $li=makeElement('li')()(name)
			$li.onclick=()=>{
				const ev=new CustomEvent<string>('module',{
					bubbles: true,
					detail: key
				})
				$li.dispatchEvent(ev)
			}
			return $li
		})
		return [makeElement('ul')()(...$menuEntries)]
	}
}
