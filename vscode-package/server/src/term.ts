import { Type } from './type';

export class Term {
	public readonly name: string;
	public readonly type: Type;

	constructor(_name: string, _type: Type) {
		this.name = _name;
		this.type = _type;
	}
}