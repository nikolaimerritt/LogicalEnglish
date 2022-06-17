import { intersectionOf, removeBlanks } from './utils';

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

	private static readonly _variableNames = [
		'an A',
		'a B',
		'a C',
		'a D',
		'an E',
		'an F',
		'a G',
		'an H'
	];

	public static fromString(templateString: string): Template {
		const argumentBlockRegex = /((?:\*)an? (?:[\w|\s]+)\*)/g;
		const elementStrings = templateString.split(argumentBlockRegex);

		const argumentNameRegex =  /\*(an? [\w|\s]+)\*/;
		let variableIdx = 0;
		const elements: TemplateElement[] = elementStrings
		.map(el => el.trim())
		.filter(el => el.length > 0)
		.map(el => {
			const argName = el.match(argumentNameRegex);
			if (argName !== null) 
				return new TemplateArgument(Template._variableNames[variableIdx++]);
			
			return new PredicateWord(el);
		});

		return new Template(elements);
	}

	public static fromLiteral(literal: string, terms: string[]): Template {
		terms = removeBlanks(terms);		
		const argumentBlockRegex = new RegExp(`(?:(${terms.join('|')}))`, 'g');
		const elementStrings = removeBlanks(literal.split(argumentBlockRegex));

		let variableIdx = 0;
		const elements: TemplateElement[] = elementStrings
		.map(el => {
			if (terms.includes(el)) 
				return new TemplateArgument(Template._variableNames[variableIdx++]);
			return new PredicateWord(el);
		});

		return new Template(elements);
	}

	public static fromLGG(literals: string[]): Template | undefined {
		const wordsFromEachLiteral = literals.map(literal => literal.split(/\s+/g));
		const predicateWords = intersectionOf(wordsFromEachLiteral);
		
		// assumes that literals all conform to same template
		// takes first literal, compares against predicate words to construct a template
		const terms = Template._extractTermsFromLiteral(literals[0], predicateWords);
		const template = Template.fromLiteral(
			literals[0],
			terms
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

	public toSnippet(): string {
		let snippet = '';
		let placeholderCount = 0;
		this.elements.forEach(el => {
			if (el.type === TemplateElementKind.Argument) {
				placeholderCount++;
				snippet += '${' + placeholderCount + ':' + el.name + '}';
			} else 
				snippet += el.word;
			
			snippet += ' ';
		});
		return snippet;
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
		
		literal = literal.replace(/\./g, '');
		const terms = this.extractTermsFromLiteral(literal);
		const templateOfLiteral = Template.fromLiteral(literal, terms);
		return this.hasSameSigniature(templateOfLiteral);
	}

	// *an X*        really likes   *an object*   with value *a value*
	// bob spence    really likes   plates        wit   
	// score = (1 + 0.5) / 2
	public matchScore(literal: string): number { // 0 <= return value <= 1
		let score = 0;
		// score = number of predicates that appear consecutively in literal
		// if the literal ends with the beginning of a predicate, add 0.5
		// normalise score by amount of predicates
		
		for (const { word } of this.predicateWords()) {
			const wordIdx = literal.indexOf(word);
			if (wordIdx === -1) {
				const lastLiteralWord = literal.split(/\s+/g).at(-1);
				if (lastLiteralWord !== undefined && word.startsWith(lastLiteralWord.trim()))
					score += 0.5;
				
				break;
			}
			
			score++;
			literal = literal.slice(wordIdx + 1, undefined);
		}
		return score / this.predicateWords().length;
	}


	private predicateWords(): PredicateWord[] {
		return this.elements
		.filter(el => el.type === TemplateElementKind.Word)
		.map(el => el as PredicateWord);
	} 
}

