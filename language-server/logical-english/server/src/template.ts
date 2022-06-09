export class Template {
	public readonly predicateName: string;
	public readonly argumentTypes: string[];

	public constructor(_predicateName: string, _argumentTypes: string[]) {
		this.predicateName = _predicateName;
		this.argumentTypes = _argumentTypes;
	}

	public static fromString(templateString: string): Template {
		const argumentRegex = /\*(?:a|an) (\w[\w|\s]+\w)\*/g;
		let matches: RegExpMatchArray | null;
		const argumentNames: string[] = [];
		let templateWithoutArguments = templateString;
		
		while ((matches = argumentRegex.exec(templateString)) != null) {
			let argName = matches[1];
			argName = argName.replace(/\s+/g, '_');
			argName = argName.toLowerCase();
			argumentNames.push(argName);

			templateWithoutArguments = templateWithoutArguments.replace(matches[0], "");
		}	
		templateWithoutArguments = templateWithoutArguments.trim();
		templateWithoutArguments = templateWithoutArguments.replace(/\s+/g, '_');

		return new Template(templateWithoutArguments, argumentNames);
	}

	public static fromLiteral(literal: string, terms: string[]): Template {
		literal = literal.replace(/\s+/g, ' ');
		const literalWords = literal.split(' ');
		const predicateWords = literalWords.filter((word: string, index: number) => !terms.includes(word));
		const predicateName = predicateWords.join('_');
	
		return new Template(predicateName, terms);
	}

	public static fromLeastGeneralGeneralisation(literals: string[]): Template | undefined {
		// const allWords = literals.map((literal: string, index: number) => literal.replace(/\s+/g, ' ').split(' '));
		const allWords = literals.map(literal => 
			literal.replace(/\s+/g, ' ').split(' ')
		);
		const predicateWords = intersectionOf(allWords);

		const allTemplates: Template[] = []; // these should all have same signiature
		for (let i = 0; i < literals.length; i++) {
			const terms = allWords[i].filter(word => !predicateWords.includes(word));
			allTemplates.push(Template.fromLiteral(literals[i], terms));
		}
		// check for whether all the templates produced are the same
		for (let i = 1; i < allTemplates.length; i++) {
			if (!allTemplates[i].hasSameSigniature(allTemplates[0]))
				return undefined;
		}

		return allTemplates[0]; // could have returned any one of those templates -- they all have the same signiature
	}

	// chcks if `this` has same predicate name *and* same argument names / types as `other`
	public equals(other: Template): boolean {
		if (!this.hasSameSigniature(other))
			return false;
		
		for (let i = 0; i < this.argumentTypes.length; i++) {
			if (this.argumentTypes[i] !== other.argumentTypes[i])
				return false;
		}

		return true;
	}

	// checks if other has the same predicate name and argument count
	public hasSameSigniature(other: Template): boolean {
		return other != null 
		&& other !== undefined
		&& this.predicateName === other.predicateName 
		&& this.argumentTypes.length === other.argumentTypes.length;
	}

	public toString(): string {
		return `${this.predicateName}(${this.argumentTypes.join(', ')})`;
	}

	public extractTermsFromLiteral(literal: string): string[] {
		literal = literal.replace(/\s+/g, ' ');
		const literalWords = literal.split(' ');
		const predicateWords = this.predicateName.split('_');
		
		const terms: string[] = [];
		let currentTerm = '';

		literalWords.forEach(word => {
			if (word === predicateWords[0]) {
				if (currentTerm.length !== 0) {
					terms.push(currentTerm);
					currentTerm = '';
				}
				predicateWords.splice(0, 1); // pop first word
			}
			else {
				if (currentTerm.length !== 0)
					currentTerm += '_';
				currentTerm += word;
			}
		});

		if (currentTerm.length !== 0) 
			terms.push(currentTerm);

		return terms;
	}

	public matchesLiteral(literal: string): boolean {
		// given literal L, template T
		// extract terms of L, assuming that L matches T
		// generate a template T' from L  using the extracted terms
		// check if T' has same signiature as T
	
		const terms = this.extractTermsFromLiteral(literal);
		const templateOfLiteral = Template.fromLiteral(literal, terms);
		return this.hasSameSigniature(templateOfLiteral);
	}
}

function intersectionOf<T>(lists: T[][]): T[] {
	const allElements: T[] = [];
	lists.forEach(list => {
		list.forEach(el => {
			if (!allElements.includes(el))
				allElements.push(el);
		});
	});
	// allElements is now a list of each element from each list

	const intersection: T[] = [];
	allElements.forEach(el => {
		if (lists.every(list => list.includes(el)))
			intersection.push(el);
	});

	return intersection;
}