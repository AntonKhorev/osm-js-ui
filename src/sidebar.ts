import {makeElement} from './util'

const makeDiv=makeElement('div')

export default class Sidebar {
	constructor($sidebar: HTMLElement) {
		const $shrunkHeading=makeDiv('shrunk-heading')()
		const $outerLeadPlaceholder=makeDiv('lead','outer')($shrunkHeading)
		const $innerLeadPlaceholder=makeDiv('lead','inner')()
		const $content=makeDiv('content')($innerLeadPlaceholder)
		$sidebar.append($outerLeadPlaceholder,$content)

		const $heading=makeElement('h1')()(
			`Temporary sidebar title that has to be looooong enough`
		)

		const outerLeadWidthBoundary=240
		const outerLeadMinHeight=48 // --lead-offset
		let isInnerHeading:boolean|undefined
		const updateLeadPlaceholdersOffset=()=>{
			const outerLeadHeight=$outerLeadPlaceholder.clientHeight
			const removeScrollOffset=()=>$outerLeadPlaceholder.style.removeProperty('translate')
			if (isInnerHeading==false) {
				const leadHeightDiff=outerLeadHeight-outerLeadMinHeight
				const scrollHeight=$content.scrollTop
				const scrollTopOffset=Math.min(leadHeightDiff,scrollHeight)
				if (scrollTopOffset<=0) {
					$outerLeadPlaceholder.classList.remove('shrunk')
					removeScrollOffset()
				} else {
					$outerLeadPlaceholder.style.translate=`0 ${-scrollTopOffset}px`
					if (scrollTopOffset<leadHeightDiff) {
						$outerLeadPlaceholder.classList.remove('shrunk')
						$shrunkHeading.replaceChildren()
					} else {
						$outerLeadPlaceholder.classList.add('shrunk')
						$shrunkHeading.replaceChildren()
						for (const $node of $heading.childNodes) {
							$shrunkHeading.append($node.cloneNode(true))
						}
					}
				}
			} else if (isInnerHeading==true) {
				removeScrollOffset()
			}
		}
		const updateLeadPlaceholdersContents=()=>{
			const outerLeadWidth=$outerLeadPlaceholder.clientWidth
			const removeInnerLeadHeight=()=>$innerLeadPlaceholder.style.removeProperty('height')
			if (outerLeadWidth<outerLeadWidthBoundary) {
				if (isInnerHeading!=true) {
					isInnerHeading=true
					removeInnerLeadHeight()
					$innerLeadPlaceholder.append($heading)
				}
			} else {
				if (isInnerHeading!=false) {
					isInnerHeading=false
					$outerLeadPlaceholder.prepend($heading)
				}
				const outerLeadHeight=$outerLeadPlaceholder.clientHeight
				const leadHeightDiff=outerLeadHeight-outerLeadMinHeight
				if (leadHeightDiff>0) {
					$innerLeadPlaceholder.style.height=leadHeightDiff+'px'
				} else {
					removeInnerLeadHeight()
				}
			}
			updateLeadPlaceholdersOffset()
		}
		const outerLeadResizeObserver=new ResizeObserver(updateLeadPlaceholdersContents)
		outerLeadResizeObserver.observe($outerLeadPlaceholder)
		$content.onscroll=updateLeadPlaceholdersOffset

		for (let i=0;i<30;i++) {
			$content.append(makeElement('p')()(
				`Lorem ipsum ${i}!`
			))
		}
	}
}
