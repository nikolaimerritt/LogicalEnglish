import { deepCopy, removeBlanks, removeFirst, regexSanitise } from './utils';
import { Type, typeTree } from './types';

export enum TemplateElementKind {
	Variable,
	Word
}

export class TemplateVariable {
	public readonly type: Type;
	public readonly kind = TemplateElementKind.Variable;

	constructor(_name: string) {
		console.log(`Creating a variable with name ${_name}`);
		this.type = typeTree.getType(_name);
	}
}

export class PredicateWord {
	public readonly word: string;
	public readonly kind = TemplateElementKind.Word;

	constructor(_word: string) {
		this.word = _word;
	}
}

export type TemplateElement = TemplateVariable | PredicateWord;

export class Template {
	private readonly elements: TemplateElement[];

	private constructor(_elements: TemplateElement[]) {
		this.elements = _elements;
	}


	public static fromString(templateString: string, useExistingVariableNames = true): Template {

		templateString = templateString.replace('.', '');
		const argumentBlockRegex = /((?:\*)an? (?:[\w|\s]+)\*)/g;
		const elementStrings = templateString.split(argumentBlockRegex);

		const argumentNameRegex =  /\*(an? [\w|\s]+)\*/;
		let variableIdx = 0;

		const elements: TemplateElement[] = [];
		for (let elString of elementStrings) {
			elString = elString.trim();
			if (elString.length > 0) {
				const varName = elString.match(argumentNameRegex);
				if (varName === null) 
					elements.push(new PredicateWord(elString));

				else {
					if (useExistingVariableNames)
						elements.push(new TemplateVariable(elString.replace(/\*/g, '')));
					else 
						elements.push(new TemplateVariable(Template.variableName(variableIdx++)));
				} 
			}
		}

		// const elements: TemplateElement[] = elementStrings
		// .map(elString => elString.trim())
		// .filter(elString => elString.length > 0)
		// .map(elString => {
		// 	const varName = elString.match(argumentNameRegex);
		// 	if (varName !== null) {
		// 		if (useExistingVariableNames)
		// 			return new TemplateVariable(elString);
		// 		else 
		// 			return new TemplateVariable(Template.variableName(variableIdx++));
		// 	}
				
		// 	return new PredicateWord(elString);
		// });

		return new Template(elements);
	}


	public static fromLiteral(literal: string, terms: string[]): Template {
		literal = literal.replace('.', '');
		terms = removeBlanks(terms);
		const sanitisedTerms = terms.map(regexSanitise);
		const argumentBlockRegex = new RegExp(`(?:(${sanitisedTerms.join('|')}))`, 'g');
		const elementStrings = removeBlanks(literal.split(argumentBlockRegex));

		let variableIdx = 0;
		const elements: TemplateElement[] = elementStrings
		.map(el => {
			if (terms.includes(el)) 
				return new TemplateVariable(Template.variableName(variableIdx++));
			return new PredicateWord(el);
		});

		return new Template(elements);
	}

	public static fromLGG(literals: string[]): Template | undefined {
		
		const wordsFromEachLiteral = literals.map(literal => literal.replace('.', '').split(/\s+/g));
		const predicateWords = Template.predicateWordsFromLiterals(wordsFromEachLiteral);
		
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
			if (this.elements[i].kind !== other.elements[i].kind)
				return false;
			
			if (this.elements[i].kind === TemplateElementKind.Word 
					&& other.elements[i].kind === TemplateElementKind.Word
					&& (this.elements[i] as PredicateWord).word !== (other.elements[i] as PredicateWord).word)
				return false;
		}

		return true;
	}

	public toString(): string {
		return this.elements
		.map(el => {
			if (el.kind === TemplateElementKind.Variable)
				return `*${el.type.name}*`;
			
			return el.word;
		})
		.join(' ');
	}

	public toSnippet(): string {
		let snippet = '';
		let placeholderCount = 0;
		this.elements.forEach(el => {
			if (el.kind === TemplateElementKind.Variable) {
				placeholderCount++;
				snippet += '${' + placeholderCount + ':' + el.type.name + '}';
			} else 
				snippet += el.word;
			
			snippet += ' ';
		});
		return snippet;
	}

	public termsFromLiteral(literal: string): string[] {
		literal = literal.replace('.', '');
		const predicateWords = this.elements
		.filter(el => el.kind === TemplateElementKind.Word)
		.map(w => (w as PredicateWord).word)
		.flatMap(word => word.split(' '));

		return Template.termsFromLiteral(literal, predicateWords);
	}
	

	public withVariable(variable: string, variableName: string | undefined = undefined): Template {
		if (variableName === undefined)
			variableName = `a ${variable}`;
		
		const variableRegex = new RegExp(`(${regexSanitise(variable)})`); // keeps the `variable` delimeter
		const newElements: TemplateElement[] = [];

		for (const el of this.elements) {
			if (el.kind === TemplateElementKind.Word && variableRegex.test(variable)) {
				const elementStrings = el.word.split(variableRegex);
				for (let elString of elementStrings) {
					elString = elString.trim();
					if (elString.length > 0) {
						if (elString === variable)
							newElements.push(new TemplateVariable(variableName));
						else 
							newElements.push(new PredicateWord(elString));
					}
				}
			} 
			else 
				newElements.push(el);
		}

		return new Template(newElements);
	}

	private static variableName(index: number): string {
		const variableNames = [
			'an X',
			'a Y',
			'a Z',
		];


		if (index >= variableNames.length) {
			const subscript = 1 + index - variableNames.length;
			return `an A${subscript}`;
		}

		return variableNames[index];
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
				if (currentTerm.length > 0) {
					terms.push(currentTerm);
					currentTerm = '';
				}
				predicateWords.shift(); // pop first word
			}
			else {
				if (currentTerm.length > 0)
					currentTerm += ' ';
				currentTerm += word;
			}
		});

		if (currentTerm.length > 0) 
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
			if (element.kind === TemplateElementKind.Word) 
				templateElements.push(element);
			else if (element.kind === TemplateElementKind.Variable) {
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
		.filter(el => el.kind === TemplateElementKind.Word)
		.map(el => el as PredicateWord);
	} 


}

