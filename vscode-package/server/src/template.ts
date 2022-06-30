import { deepCopy, intersectionOf, removeBlanks, removeFirst } from './utils';

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
		const predicateWords = Template.predicateWordsFromLiterals(wordsFromEachLiteral); // BUG: should produce 'the mother of the person is'
		// produces 'the mother of person is'
		
		// assumes that literals all conform to same template
		// takes first literal, compares against predicate words to construct a template
		const terms = Template.termsFromLiteral(literals[0], predicateWords);
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

	public termsFromLiteral(literal: string): string[] {
		const predicateWords = this.elements
		.filter(el => el.type === TemplateElementKind.Word)
		.map(w => (w as PredicateWord).word)
		.flatMap(word => word.split(' '));

		return Template.termsFromLiteral(literal, predicateWords);
	}

	// the 	big mother 		of the person is 	unknown
	// the 	very ugly dad 	of the person is 	a citizen
	// the 	___				of the person is	___

	private static predicateWordsFromLiterals(literals: string[][]): string[] {
		const literal = literals[0];
		const otherLiterals: string[][] = deepCopy(literals.slice(1, undefined));
		const predicateWords: string[] = [];

		for (const word of literal) {
			if (otherLiterals.every(literal => literal.includes(word))) {
				predicateWords.push(word);
				for (const otherLiteral of otherLiterals) 
					removeFirst(otherLiteral, word);
			}
		}

		return predicateWords;
	}
		
	private static termsFromLiteral(literal: string, predicateWords: string[]): string[] {
		const literalWords = literal.split(/\s+/g);
		const terms: string[] = [];
		let currentTerm = '';

		literalWords.forEach(word => {
			if (predicateWords.length > 0 && word === predicateWords[0]) {
				if (currentTerm.length !== 0) {
					terms.push(currentTerm);
					currentTerm = '';
				}
				predicateWords.shift(); // pop first word
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

	private termsFromIncompleteLiteral(literal: string): string[] {
		const literalWords = literal.split(/\s+/g);
		const predicateWords = this.predicateWords()
		.flatMap(w => w.word.split(/\s+/g));
		const terms: string[] = [];
		let currentTerm = '';


		for (let i = 0; i < literalWords.length; i++) {
			if (predicateWords.length > 0 && 
					(literalWords[i] === predicateWords[0] 
						|| i === literalWords.length - 1 && predicateWords[0].startsWith(literalWords[i]))) {
				if (currentTerm.length > 0) {
					terms.push(currentTerm);
					currentTerm = '';  
				}
				predicateWords.shift(); // pop first word
			} else {
				if (currentTerm.length > 0) 
					currentTerm += ' ';
				currentTerm += literalWords[i];
			}
		}

		if (currentTerm.length > 0)
			terms.push(currentTerm);

		return terms;
	}


	public matchesLiteral(literal: string): boolean {
		// given literal L, template T
		// extract terms of L, assuming that L matches T
		// generate a template T' from L  using the extracted terms
		// check if T' has same signiature as T
		
		literal = literal.replace(/\./g, '');
		const terms = this.termsFromLiteral(literal);
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
			} else {
				score++;
				literal = literal.slice(wordIdx + 1, );
			}
		}
		return score / this.predicateWords().length;
	}

	// *an A* 		really likes 	*a B* 	with value 	*a C*
	// fred bloggs	really likes 	apples	with val
	// output = fred bloggs really likes apples with value *a C*
	public templateWithMissingTerms(literal: string): Template {
		const terms = this.termsFromIncompleteLiteral(literal);
		const templateElements: TemplateElement[] = [];
		this.elements.forEach(element => {
			if (element.type === TemplateElementKind.Word) 
				templateElements.push(element);
			else if (element.type === TemplateElementKind.Argument) {
				if (terms.length > 0) {
					templateElements.push(new PredicateWord(terms[0]));
					terms.shift(); // remove first term
				} else 
					templateElements.push(element);
			}
		});

		return new Template(templateElements);
	}


	private predicateWords(): PredicateWord[] {
		return this.elements
		.filter(el => el.type === TemplateElementKind.Word)
		.map(el => el as PredicateWord);
	} 
}

