export type Content = Array<string|Node>

export function makeElement<K extends keyof HTMLElementTagNameMap>(tag: K): ((...classes: string[])=>(...items: Content)=>HTMLElementTagNameMap[K]) {
	return (...classes)=>(...items)=>{
		const $element=document.createElement(tag)
		if (classes.length>0) $element.classList.add(...classes)
		$element.append(...items)
		return $element
	}
}

export const makeDiv=makeElement('div')

export function makeButton(title:string,href:string,cls?:string) {
	const $button=makeElement('button')(cls??href)()
	$button.innerHTML=`<svg><title>${title}</title><use href="#button-${href}" /></svg>`
	return $button
}

export function makeLink(text: string, href: string): HTMLAnchorElement {
	const $link=document.createElement('a')
	$link.href=href
	$link.textContent=text
	return $link
}
