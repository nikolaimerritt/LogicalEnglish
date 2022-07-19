
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position, Range } from 'vscode-languageserver';
import { Template } from './template';
import { Term } from './term';
import { TypeTree } from './type';
import { defaultTemplateStrings } from './default-templates';

export type ContentRange<T> = {
	content: T,
	range: Range
}

export function sectionRange(headerText: string, text: string): ContentRange<string[]> | undefined {
	const lines = text.split('\n');
	
	let start: Position | undefined = undefined;
	let end: Position | undefined = undefined;

	for (let i = 0; i < lines.length; i++) {
		if (lines[i].includes(':')) {
			if (start !== undefined) {
				end = { line: i - 1, character: 0 };
				break;
			}
			else if (lines[i].includes(headerText))
				start = { line: i + 1, character: 0 };
		}
	}

	if (start === undefined)
		return undefined;
	
	if (end === undefined)
		end = { line: lines.length, character: 0 };

	return {
		content: lines.slice(start.line, end.line + 1),
		range: { 
			start, end
		}
	};
}


export function typeTreeInDocument(text: string): TypeTree {
	const typeHierarchy = sectionRange('type hierarchy', text);
	const tree = typeHierarchy
		? TypeTree.fromHierarchy(typeHierarchy.content) 
		: new TypeTree();

	const templateLines = sectionRange('templates', text);
	const typeNameRegex = /(?<=\*)an? [\w|\s]+(?=\*)/g;
	if (templateLines !== undefined) {
		for (const line of templateLines.content) {
			for (const [typeName] of line.matchAll(typeNameRegex)) 
				tree.addType(typeName);
		}
	}

	return tree;
}


export function templatesInDocument(text: string): Template[] {
	const templateRange = sectionRange('templates', text);
	const typeTree = typeTreeInDocument(text); // TODO: refactor this as argument?
	if (templateRange === undefined)
		return [];
	
	const templates: Template[] = [];
	const templateStrings = templateRange.content
	.concat(defaultTemplateStrings);

	for (let templateString of templateStrings) {
		templateString = templateString.trim();
		if (templateString.length > 0) 
			templates.push(Template.fromString(typeTree, templateString));
	}

	return templates;
}


export function clausesInDocument(text: string): ContentRange<string>[] {
	const clauseRange = sectionRange('knowledge base', text)?.range;

	if (clauseRange === undefined)
		return [];
	
	const lines = text.split('\n');
	const clauses: ContentRange<string>[] = [];
	const clauseStartPattern = /^.*\w+.*$/;
	const clauseEndPattern = /^.*\.$/;

	let clauseStart = undefined;
	let clauseEnd = undefined;
	let isInsideClause = false;

	for (let l = clauseRange.start.line; l <= clauseRange.end.line && l < lines.length; l++) {
		if (clauseStartPattern.test(lines[l]) && !isInsideClause) {
			clauseStart = l;
			isInsideClause = true;
		}
			
		if (clauseStart !== undefined && clauseEndPattern.test(lines[l])) {
			clauseEnd = l;
			clauses.push({
				content: lines.slice(clauseStart, clauseEnd + 1).join('\n'),
				range: {
					start: {
						line: clauseStart,
						character: 0
					},
					end: {
						line: clauseEnd,
						character: lines[clauseEnd].length
					}
				} 
			});
			isInsideClause = false;
		}
	}

	return clauses;
}


export function literalsInClause(clause: ContentRange<string>): ContentRange<string>[] {
	const connectives = [
		'if',
		'and',
		'or',
		'it is the case that',
		'it is not the case that'
	];
	const connectivesPattern = connectives
	.map(conn => `^\\s*${conn}\\b|\\b${conn}\\s*$`)
	.join('|');

	const connectivesRegex = new RegExp(connectivesPattern, 'gm');
	const lines = clause.content.split('\n');
	const literalsWithRanges: ContentRange<string>[] = [];

	for (let lineOffset = 0; lineOffset < lines.length; lineOffset++) {
		const lineNumber = clause.range.start.line + lineOffset;
		const literalsInLine = lines[lineOffset].split(connectivesRegex)
		.map(lit => lit.trim())
		.filter(lit => lit.length > 0);

		literalsInLine.forEach(lit => {
			lit = sanitiseLiteral(lit);
			const range: Range = {
				start: {
					line: lineNumber,
					character: lines[lineOffset].indexOf(lit)
				},
				end: {
					line: lineNumber,
					character: lines[lineOffset].indexOf(lit) + lit.length
				}
			};
			literalsWithRanges.push({
				content: lit,
				range
			});
		});
	}

	return literalsWithRanges;
}



export function literalsInDocument(text: string): ContentRange<string>[] {
	return clausesInDocument(text)
	.flatMap(clause => literalsInClause(clause));
}


export function termsInClause(templates: Template[], clause: ContentRange<string>): ContentRange<Term>[] {
	const termRanges: ContentRange<Term>[] = [];

	for (const { content: literal, range: literalRange } of literalsInClause(clause)) {
		// const template = templates.find(t => t.matchesLiteral(literal));
		const template = Template.findBestMatch(templates, literal);
		if (template !== undefined) {
			let termIdx = 0;

			for (const term of template.termsFromLiteral(literal)) {
				termIdx = literal.indexOf(term.name, termIdx);
				termRanges.push({
					content: term,
					range: {
						start: { 
							line: literalRange.start.line, 
							character: literalRange.start.character + termIdx 
						},
						end: { 
							line: literalRange.start.line, 
							character: literalRange.start.character + termIdx + term.name.length 
						}
					}
				});
				termIdx += term.name.length;
			}
		}
	}

	return termRanges;
}


// export function intersectionOf<T>(lists: T[][]): T[] {
// 	const allElements: T[] = [];
// 	for (const el of lists[0]) {
// 		if (lists.every(list => list.includes(el)))
// 			allElements.push(el);
// 	}
// 	// allElements is now a list of each element from each list

// 	const intersection: T[] = [];
// 	allElements.forEach(el => {
// 		if (lists.every(list => list.includes(el)))
// 			intersection.push(el);
// 	});

// 	return intersection;
// }


export function maximal<T>(list: T[], valueFunction: (element: T) => number): T {
	let bestElement = list[0];
	let maxValue = valueFunction(bestElement);

	for (let i = 1; i < list.length; i++) {
		const value = valueFunction(list[i]);
		if (value > maxValue) {
			bestElement = list[i];
			maxValue = value;
		}
	}

	return bestElement;
}

export function removeBlanks(words: string[]): string[] {
	return words
	.map(word => word.trim())
	.filter(word => word.length > 0);
}

export function removeFirst<T>(list: T[], element: T): void {
	const idx = list.indexOf(element);
	if (idx === -1)
		return;
	
	list.splice(idx, 1);
}


export function deepCopy<T>(object: T): T {
	return JSON.parse(JSON.stringify(object));
}

// taken from https://stackoverflow.com/questions/6300183/sanitize-string-of-regex-characters-before-regexp-build
export function regexSanitise(pattern: string): string {
	return pattern.replace(/[#-.]|[[-^]|[?|{}]/g, '\\$&');
}


export function sanitiseLiteral(literal: string): string {
	return literal.replace('.', '').trim();
}


export function literalAtPosition(line: string, characterOffset: number): string | undefined {
	const connectives = /\b(?:if|and|or|that|it is the case that|it is not the case that)\b/g;
	const literals = line
	.split(connectives)
	.map(literal => literal.trim().replace('.', ''))
	.filter(literal => literal.length > 0);

	for (const literal of literals) {
		const startPos = line.indexOf(literal);
		const endPos = startPos + literal.length;

		if (startPos <= characterOffset && characterOffset <= endPos)
			return literal;
	}

	return undefined;
}

export function ignoreComments(text: string): string {
	const singleLineComment = /%.*/g;
	return text.replace(singleLineComment, '');
}