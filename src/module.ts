import {Content} from './html'

export default abstract class Module {
	abstract makeHeading():Content
	abstract makeContent():Content
}
