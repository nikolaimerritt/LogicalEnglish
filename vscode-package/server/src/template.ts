import { deepCopy, removeBlanks, removeFirst, regexSanitise } from './utils';
import { Type, TypeTree } from './type';
import { Term } from './term';

export enum TokenKind {
	Type,
	Word
}


// export class TemplateVariable {
// 	public readonly type: Type;
// 	public readonly kind = TemplateElementKind.Type;

// 	constructor(_name: string, typeTree: TypeTree) {
// 		this.type = typeTree.getType(_name);
// 	}
// }


export type PredicateWord = string;


export class Token {
	public readonly kind: TokenKind;
	public readonly content: Type | PredicateWord;

	constructor(kind: TokenKind, content: Type | PredicateWord) {
		this.kind = kind;
		this.content = content;
	}

	public static fromType(type: Type): Token {
		return new Token(TokenKind.Type, type);
	}

	public static fromWord(word: PredicateWord): Token {
		return new Token(TokenKind.Word, word);
	}
}


export class Template {
	private readonly elements: Token[];
	public static readonly typeNameRegex = /\*(an? [\w|\s]+)\*/;

	private constructor(_elements: Token[]) {
		this.elements = _elements;
	}


	public static fromString(typeTree: TypeTree, templateString: string, useExistingVariableNames = true): Template {
		templateString = templateString.replace('.', '');
		const argumentBlockRegex = /((?:\*)an? (?:[\w|\s]+)\*)/g;
		const elementStrings = templateString.split(argumentBlockRegex);

		let variableIdx = 0;

		const elements: Token[] = [];
		for (let elString of elementStrings) {
			elString = elString.trim();
			if (elString.length > 0) {
				const varName = elString.match(Template.typeNameRegex);
				if (varName === null) 
					// elements.push(new PredicateWord(elString));
					elements.push(Token.fromWord(elString));

				else {
					const typeName = useExistingVariableNames 
						? elString.replace(/\*/g, '')
						: Template.variableName(variableIdx++);

					elements.push(Token.fromType(typeTree.getType(typeName)));
					// if (useExistingVariableNames)
					// 	// elements.push(new TemplateVariable(elString.replace(/\*/g, '')));
					// else 
					// 	elements.push(new TemplateVariable(Template.variableName(variableIdx++)));
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


	public static fromLiteral(typeTree: TypeTree, literal: string, terms: Term[]): Template {
		literal = literal.replace('.', '');
		terms = terms.filter(t => t.name.trim().length > 0);
		const sanitisedTermNames = terms.map(t => regexSanitise(t.name));
		const argumentBlockRegex = new RegExp(`(?:(${sanitisedTermNames.join('|')}))`, 'g');
		const elementStrings = removeBlanks(literal.split(argumentBlockRegex));

		let variableIdx = 0;
		const elements: Token[] = elementStrings
		.map(el => {
			if (terms.some(t => t.name === el)) 
				// return new TemplateVariable(Template.variableName(variableIdx++));
				return Token.fromType(typeTree.getType(Template.variableName(variableIdx++)));
			// return new PredicateWord(el);
			return Token.fromWord(el);
		});

		return new Template(elements);
	}

	public static fromLGG(typeTree: TypeTree, literals: string[]): Template | undefined {
		
		const wordsFromEachLiteral = literals.map(literal => literal.replace('.', '').split(/\s+/g));
		const predicateWords = Template.predicateWordsFromLiterals(wordsFromEachLiteral);
		
		// assumes that literals all conform to same template
		// takes first literal, compares against predicate words to construct a template
		const termNames = Template.termNamesFromLiteral(literals[0], predicateWords);
		const terms = termNames.map(t => new Term(t, typeTree.getType(t)));
		const template = Template.fromLiteral(typeTree, literals[0], terms);

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
			
			if (this.elements[i].kind === TokenKind.Word 
					&& other.elements[i].kind === TokenKind.Word
					&& this.elements[i].content as PredicateWord !== other.elements[i].content as PredicateWord)
				return false;
		}

		return true;
	}

	public toString(): string {
		return this.elements
		.map(el => {
			if (el.kind === TokenKind.Type)
				return `*${(el.content as Type).name}*`;
			
			return el.content as PredicateWord;
		})
		.join(' ');
	}

	public toSnippet(): string {
		let snippet = '';
		let placeholderCount = 0;
		this.elements.forEach(el => {
			if (el.kind === TokenKind.Type) {
				placeholderCount++;
				snippet += '${' + placeholderCount + ':' + (el.content as Type).name + '}';
			} else 
				snippet += (el.content as PredicateWord);
			
			snippet += ' ';
		});
		return snippet;
	}

	
	public termsFromLiteral(literal: string): Term[] {
		literal = literal.replace('.', '');
		const predicateWords = this.elements
		.filter(el => el.kind === TokenKind.Word)
		.map(w => w.content as PredicateWord)
		.flatMap(word => word.split(' '));

		const termNames = Template.termNamesFromLiteral(literal, predicateWords);
		const variables = this.templateVariables();
		const terms: Term[] = [];
		
		for (let i = 0; i < termNames.length; i++) 
			terms.push(new Term(termNames[i], variables[i]));
		
		return terms;
	}
	

	// TODO: refactor to take variable as term -- then no need for type tree
	public withVariable(term: Term, variableName: string | undefined = undefined): Template {
		if (variableName === undefined)
			variableName = `a ${term}`;
		
		const variableRegex = new RegExp(`(${regexSanitise(term.name)})`); // keeps the `variable` delimeter
		const newElements: Token[] = [];

		for (const el of this.elements) {
			if (el.kind === TokenKind.Word && variableRegex.test(term.name)) {
				const elementStrings = (el.content as PredicateWord).split(variableRegex);
				for (let elString of elementStrings) {
					elString = elString.trim();
					if (elString.length > 0) {
						if (elString === term.name)
							// newElements.push(new TemplateVariable(variableName));
							newElements.push(Token.fromType(term.type));
						else 
							// newElements.push(new PredicateWord(elString));
							newElements.push(Token.fromWord(elString));
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
		
	private static termNamesFromLiteral(literal: string, predicateWords: string[]): string[] {
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
		.flatMap(w => w.split(/\s+/g));
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


	// TODO: use clause to see if the types of literal's terms match with this template
	public matchesLiteral(literal: string): boolean {
		// given literal L, template T
		// extract terms of L, assuming that L matches T
		// generate a template T' from L  using the extracted terms
		// check if T' has same signiature as T
		
		literal = literal.replace(/\./g, '');
		const terms = this.termsFromLiteral(literal);
		// TODO: ignoring types here, by supplying blank type tree!
		const templateOfLiteral = Template.fromLiteral(new TypeTree(), literal, terms);
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
		
		for (const word of this.predicateWords()) {
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
	public templateWithMissingTerms(typeTree: TypeTree, literal: string): Template {
		const terms = this.termsFromIncompleteLiteral(literal);
		const tokens: Token[] = [];
		this.elements.forEach(token => {
			if (token.kind === TokenKind.Word) 
				tokens.push(token);
			else if (token.kind === TokenKind.Type) {
				if (terms.length > 0) {
					// templateElements.push(new PredicateWord(terms[0]));
					tokens.push(Token.fromType(typeTree.getType(terms[0]))); // TODO: should this not be fromType ??
					terms.shift(); // remove first term
				} else 
					tokens.push(token);
			}
		});

		return new Template(tokens);
	}


	private predicateWords(): PredicateWord[] {
		return this.elements
		.filter(el => el.kind === TokenKind.Word)
		.map(el => el.content as PredicateWord);
	} 


	public templateVariables(): Type[] {
		return this.elements
		.filter(el => el.kind === TokenKind.Type)
		.map(el => el.content as Type);
	}
}

