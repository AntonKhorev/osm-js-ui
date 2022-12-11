import Module from '../module'
import {Content, makeElement, makeLink} from '../html'

export default class TestModule extends Module {
	makeHeading():Content {
		return [
			`Temporary sidebar title that has to be looooong enough. I want it to take at least three lines when shrunk.`
		]
	}
	makeContent():Content {
		const content:Content=[]
		const places:[string,string][]=[
			[`bronze horseman`,`#module=test&map=18/59.93641/30.30218`],
			[`issac cathedral`,`#module=test&map=18/59.93407/30.30614`],
			[`winter palace`,`#module=test&map=18/59.94044/30.31377`],
			[`peter & paul cathedral`,`#module=test&map=18/59.95020/30.31642`],
			[`mosque`,`#module=test&map=18/59.95520/30.32394`],
		]
		for (const [name,href] of places) {
			content.push(makeElement('p')()(
				makeLink(name,href)
			))
		}
		for (let i=0;i<30;i++) {
			content.push(makeElement('p')()(
				`Lorem ipsum ${i}!`
			))
		}
		return content
	}
}
