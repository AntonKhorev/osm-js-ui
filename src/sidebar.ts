import {makeElement, makeDiv} from './html'
import Module from './module'

export default class SidebarPane {
	private $heading=makeElement('h1')()()
	private $content=makeDiv('content')()
	constructor($sidebar: HTMLElement) {
		const $shrunkHeading=makeDiv('shrunk-heading')()
		const $outerLeadPlaceholder=makeDiv('lead','outer')($shrunkHeading)
		const $innerLeadPlaceholder=makeDiv('lead','inner')()
		const $scrollArea=makeDiv('scroll-area')($innerLeadPlaceholder,this.$content)
		$sidebar.append($outerLeadPlaceholder,$scrollArea)

		const outerLeadWidthBoundary=240
		const outerLeadMinHeight=48 // --lead-offset
		let isInnerHeading:boolean|undefined
		const hideShrunkHeading=()=>{
			$shrunkHeading.replaceChildren()
		}
		const showShrunkHeading=()=>{
			if ($shrunkHeading.hasChildNodes()) return
			$shrunkHeading.replaceChildren()
			for (const $node of this.$heading.childNodes) {
				$shrunkHeading.append($node.cloneNode(true))
			}
		}
		const updateLeadPlaceholdersOffset=()=>{
			const outerLeadHeight=$outerLeadPlaceholder.clientHeight
			const removeScrollOffset=()=>$outerLeadPlaceholder.style.removeProperty('translate')
			const scrollHeight=$scrollArea.scrollTop
			if (isInnerHeading==false) {
				const leadHeightDiff=outerLeadHeight-outerLeadMinHeight
				const scrollTopOffset=Math.min(leadHeightDiff,scrollHeight)
				if (scrollTopOffset<=0) {
					removeScrollOffset()
					hideShrunkHeading()
				} else {
					$outerLeadPlaceholder.style.translate=`0 ${-scrollTopOffset}px`
					if (scrollTopOffset<leadHeightDiff) {
						hideShrunkHeading()
					} else {
						showShrunkHeading()
					}
				}
			} else if (isInnerHeading==true) {
				removeScrollOffset()
				if (scrollHeight<this.$heading.clientHeight) {
					hideShrunkHeading()
				} else {
					showShrunkHeading()
				}
			}
		}
		const updateLeadPlaceholdersContents=()=>{
			const outerLeadWidth=$outerLeadPlaceholder.clientWidth
			const removeInnerLeadHeight=()=>$innerLeadPlaceholder.style.removeProperty('height')
			if (outerLeadWidth<outerLeadWidthBoundary) {
				if (isInnerHeading!=true) {
					isInnerHeading=true
					removeInnerLeadHeight()
					$innerLeadPlaceholder.append(this.$heading)
				}
			} else {
				if (isInnerHeading!=false) {
					isInnerHeading=false
					$outerLeadPlaceholder.append(this.$heading)
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
		$scrollArea.onscroll=updateLeadPlaceholdersOffset
	}
	setModule(module: Module) {
		this.$heading.replaceChildren(
			...module.makeHeading()
		)
		this.$content.replaceChildren(
			...module.makeContent()
		)
	}
}
