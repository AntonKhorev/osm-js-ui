import Module from '../module'
import {Content, makeElement} from '../util'

export default class TestModule extends Module {
	makeHeading():Content {
		return [
			`Temporary sidebar title that has to be looooong enough. I want it to take at least three lines when shrunk.`
		]
	}
	makeContent():Content {
		const content:Content=[]
		for (let i=0;i<30;i++) {
			content.push(makeElement('p')()(
				`Lorem ipsum ${i}!`
			))
		}
		return content
	}
}
