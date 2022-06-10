import { intersectionOf } from './utils';

export enum TemplateElementKind {
	Argument,
	Word
}

export type TemplateArgument = {
	name: string,
	type: TemplateElementKind.Argument
}

export type PredicateWord = {
	word: string,
	type: TemplateElementKind.Word
}

export type TemplateElement = TemplateArgument | PredicateWord;

export class Template {
	private readonly elements: TemplateElement[];

	private constructor(_elements: TemplateElement[]) {
		this.elements = _elements;
	}

	public static fromString(templateString: string): Template {
		const argumentBlockRegex = /((?:\*)(?:a|an) (?:\w[\w|\s]+\w)\*)/g;
		// let matches: RegExpMatchArray | null;
		// const argumentNames: string[] = [];
		// let templateWithoutArguments = templateString;
		
		// while ((matches = argumentRegex.exec(templateString)) != null) {
		// 	let argName = matches[1];
		// 	argName = argName.replace(/\s+/g, '_');
		// 	argName = argName.toLowerCase();
		// 	argumentNames.push(argName);

		// 	templateWithoutArguments = templateWithoutArguments.replace(matches[0], "");
		// }	
		// templateWithoutArguments = templateWithoutArguments.trim();
		// templateWithoutArguments = templateWithoutArguments.replace(/\s+/g, '_');

		// // use .split(/(arg 1|arg 2|...|arg n)/g) on template string


		// return new Template(templateWithoutArguments, argumentNames);
		const elementStrings = templateString.split(argumentBlockRegex);
		const argumentNameRegex =  /\*(an? \w[\w|\s]+\w)\*/;
		const elements: TemplateElement[] = elementStrings
		.map(el => el.trim())
		.filter(el => el.length > 0)
		.map(el => {
			const argName = el.match(argumentNameRegex);
			if (argName !== null) 
				return { name: argName[1] } as TemplateArgument;
			
			return { word: el } as PredicateWord;
		});

		return new Template(elements);
	}

	// public static fromLiteral(literal: string, terms: string[]): Template {
	// 	const literalWords = literal.split(/\s+/g);
	// 	const predicateWords = literalWords.filter((word: string) => !terms.includes(word));
	// 	const predicateName = predicateWords.join('_');
	
	// 	return new Template(predicateName, terms);
	// }

	public static fromLiteral(literal: string, terms: string[]): Template {
		const argumentBlockRegex = RegExp(`(?:(${terms.join('|')}))`, 'g');

		const elementStrings = literal.split(argumentBlockRegex);
		console.log("Element strings:");
		console.log(elementStrings);

		const elements: TemplateElement[] = elementStrings
		.map(el => el.trim())
		.filter(el => el.length > 0)
		.map(el => {
			if (terms.includes(el)) 
				return { name: el } as TemplateArgument;
			return { word: el } as PredicateWord;
		});

		return new Template(elements);
	}

	public static fromLggOf(literals: string[]): Template | undefined {
		// const allWords = literals.map((literal: string, index: number) => literal.replace(/\s+/g, ' ').split(' '));
		const allWords = literals.map(literal => literal.split(/\s+/g));
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
		
		for (let i = 0; i < this.elements.length; i++) {
			if (this.elements[i] !== other.elements[i])
				return false;
		}

		return true;
	}

	// checks if other has the same predicate name and argument count
	public hasSameSigniature(other: Template): boolean {
		if (other === null)
			return false;
		
		if (other === undefined)
			return false;
		
		if (this.elements.length !== other.elements.length)
			return false;
		
		for (let i = 0; i < this.elements.length; i++) {
			if (this.elements[i].type !== other.elements[i].type)
				return false;
			
			if (this.elements[i].type === TemplateElementKind.Word 
					&& other.elements[i].type === TemplateElementKind.Word
					&& (this.elements[i] as PredicateWord).word !== (other.elements[i] as PredicateWord).word)
				
				return false;
		}

		return true;
	}

	public toString(): string {
		return this.elements
		.map(el => {
			if (el.type === TemplateElementKind.Argument)
				return `*${el.name}*`;
			
			return el.word;
		})
		.join(' ');
	}

	public extractTermsFromLiteral(literal: string): string[] {
		const literalWords = literal.split(/\s+/g);
		const predicateWords = this.elements
		.filter(el => el.type === TemplateElementKind.Word)
		.map(w => (w as PredicateWord).word);
		
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

