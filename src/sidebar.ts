import {makeElement} from './util'

const makeDiv=makeElement('div')

export default class Sidebar {
	constructor($sidebar: HTMLElement) {
		const $outerLeadPlaceholder=makeDiv('lead','outer')()
		const $innerLeadPlaceholder=makeDiv('lead','inner')()
		const $content=makeDiv('content')($innerLeadPlaceholder)
		$sidebar.append($outerLeadPlaceholder,$content)

		const $heading=makeElement('h1')()(
			`Temporary sidebar title`
		)

		const outerLeadWidthBoundary=240
		let outerLeadMinHeight:number|undefined
		const outerLeadResizeObserver=new ResizeObserver(()=>{
			const outerLeadHeight=$outerLeadPlaceholder.clientHeight
			if (outerLeadMinHeight==null) {
				outerLeadMinHeight=outerLeadHeight
			}
			const outerLeadWidth=$outerLeadPlaceholder.clientWidth
			if (outerLeadWidth<outerLeadWidthBoundary) {
				$innerLeadPlaceholder.style.removeProperty('height')
				$innerLeadPlaceholder.append($heading)
			} else {
				$outerLeadPlaceholder.append($heading)
				const leadHeightDiff=outerLeadHeight-outerLeadMinHeight
				if (leadHeightDiff>0) {
					$innerLeadPlaceholder.style.height=leadHeightDiff+'px'
				} else {
					$innerLeadPlaceholder.style.removeProperty('height')
				}
			}
		})
		outerLeadResizeObserver.observe($outerLeadPlaceholder)

		for (let i=0;i<30;i++) {
			$content.append(makeElement('p')()(
				`Lorem ipsum ${i}!`
			))
		}
	}
}
