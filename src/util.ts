export function makeEscapeTag(escapeFn: (text: string) => string): (strings: TemplateStringsArray, ...values: unknown[]) => string {
	return function(strings: TemplateStringsArray, ...values: unknown[]): string {
		let result=strings[0]
		for (let i=0;i<values.length;i++) {
			result+=escapeFn(String(values[i]))+strings[i+1]
		}
		return result
	}
}

export function makeElement<K extends keyof HTMLElementTagNameMap>(tag: K): ((...classes: string[])=>(...items: Array<string|HTMLElement>)=>HTMLElementTagNameMap[K]) {
	return (...classes)=>(...items)=>{
		const $element=document.createElement(tag)
		$element.classList.add(...classes)
		$element.append(...items)
		return $element
	}
}
