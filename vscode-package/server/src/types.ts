export class Type {
	public readonly name: string;
	public readonly subtypes: Type[];

	constructor(_name: string, _subtypes: Type[] = []) {
		this.name = _name;
		this.subtypes = _subtypes;
	}

	public makeSubtype(type: Type) {
		if (type.name !== this.name)
			this.subtypes.push(type);
		else throw new Error(`Type ${this.name} cannot set itself as a sub-type.`);
	}
}


export class TypeTree {
	private readonly root: Type;
	private static readonly baseTypeName = 'any';


	constructor() {
		this.root = new Type(TypeTree.baseTypeName);
	}


	public getType(name: string): Type { // creates if does not exist
		const maybeType = this.find(t => t.name === name);
		if (maybeType !== undefined)
			return maybeType;
		
		const newType = new Type(name);
		this.root.makeSubtype(newType);
		return newType;
	}

	public toString(): string {
		return this.buildStringRepresentation('');
	}


	private buildStringRepresentation(repr: string, start = this.root, depth = 0): string {
		const indent = '    ';
		repr += indent.repeat(depth) + start.name + '\n';
		for (const sub of start.subtypes)
			repr = this.buildStringRepresentation(repr, sub, depth + 1);
		
		return repr;
	}


	private find(predicate: (type: Type) => boolean, start = this.root): Type | undefined {
		if (predicate(start))
			return start;
		
		for (const subtype of start.subtypes) {
			if (this.find(predicate, subtype) !== undefined)
				return subtype;
		}

		return undefined;
	}


}


export const typeTree = new TypeTree();