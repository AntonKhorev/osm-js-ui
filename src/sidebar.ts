import {makeElement} from './util'

export default class Sidebar {
	constructor($sidebar: HTMLElement, $sidebarHeading: HTMLHeadingElement) {
		$sidebarHeading.append(
			`Temporary sidebar title`
		)
	}
}
