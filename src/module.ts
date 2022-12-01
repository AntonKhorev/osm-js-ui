import {Content} from './util'

export default abstract class Module {
	abstract makeHeading():Content
	abstract makeContent():Content
}
