import { intersectionOf } from './utils';

export enum TemplateElementKind {
	Argument,
	Word
}

export class TemplateArgument {
	public readonly name: string;
	public readonly type = TemplateElementKind.Argument;

	constructor(_name: string) {
		this.name = _name;
	}
}

export class PredicateWord {
	public readonly word: string;
	public readonly type = TemplateElementKind.Word;

	constructor(_word: string) {
		this.word = _word;
	}
}

export type TemplateElement = TemplateArgument | PredicateWord;

export class Template {
	private readonly elements: TemplateElement[];

	private constructor(_elements: TemplateElement[]) {
		this.elements = _elements;
	}

	public static fromString(templateString: string): Template {
		const argumentBlockRegex = /((?:\*)an? (?:[\w|\s]+)\*)/g;
		const elementStrings = templateString.split(argumentBlockRegex);

		// console.log("Element strings:");
		// console.log(elementStrings);

		const argumentNameRegex =  /\*(an? [\w|\s]+)\*/;
		const elements: TemplateElement[] = elementStrings
		.map(el => el.trim())
		.filter(el => el.length > 0)
		.map(el => {
			const argName = el.match(argumentNameRegex);
			if (argName !== null) 
				return new TemplateArgument(argName[1]);
			
			return new PredicateWord(el);
		});

		return new Template(elements);
	}

	public static fromLiteral(literal: string, terms: string[]): Template {
		const argumentBlockRegex = RegExp(`(?:(${terms.join('|')}))`, 'g');
		const elementStrings = literal.split(argumentBlockRegex);
		// console.log("Element strings:");
		// console.log(elementStrings);

		const elements: TemplateElement[] = elementStrings
		.map(el => el.trim())
		.filter(el => el.length > 0)
		.map(el => {
			if (terms.includes(el)) 
				return new TemplateArgument(el);
			return new PredicateWord(el);
		});

		return new Template(elements);
	}

	// public static fromLggOf(literals: string[]): Template | undefined {
	// 	const wordsFromEachLiteral = literals.map(literal => literal.split(/\s+/g));
	// 	const predicateWords = intersectionOf(wordsFromEachLiteral);

	// 	const allTemplates: Template[] = []; // these should all have same signiature
	// 	for (let i = 0; i < literals.length; i++) {
	// 		const terms = wordsFromEachLiteral[i].filter(word => !predicateWords.includes(word));
	// 		allTemplates.push(Template.fromLiteral(literals[i], terms));
	// 	}
	// 	// check for whether all the templates produced are the same
	// 	for (let i = 1; i < allTemplates.length; i++) {
	// 		if (!allTemplates[i].hasSameSigniature(allTemplates[0]))
	// 			return undefined;
	// 	}

	// 	return allTemplates[0]; // could have returned any one of those templates -- they all have the same signiature
	// }

	public static fromLGG(literals: string[]): Template | undefined {
		// bob spence really likes apples and pears
		// mary really likes kiwi and pecan tart
		const wordsFromEachLiteral = literals.map(literal => literal.split(/\s+/g));
		const predicateWords = intersectionOf(wordsFromEachLiteral);
		// assumes that literals all conform to same template
		// takes first literal, compares against predicate words to construct a template
		const template = Template.fromLiteral(
			literals[0],
			Template._extractTermsFromLiteral(literals[0], predicateWords)
		);

		// now check that all literals match the template
		if (literals.some(literal => !template.matchesLiteral(literal)))
			return undefined;
		
		return template;
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
		const predicateWords = this.elements
		.filter(el => el.type === TemplateElementKind.Word)
		.map(w => (w as PredicateWord).word)
		.flatMap(word => word.split(' '));

		return Template._extractTermsFromLiteral(literal, predicateWords);
	}
		
	private static _extractTermsFromLiteral(literal: string, predicateWords: string[]) {
		const literalWords = literal.split(/\s+/g);
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
					currentTerm += ' ';
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

