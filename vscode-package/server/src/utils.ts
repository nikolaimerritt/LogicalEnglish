
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position, Range } from 'vscode-languageserver';
import { Template } from './template';

export type ContentRange<T> = {
	content: T,
	range: Range
}

export function sectionRange(headerText: string, text: string): Range | undefined {
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

	return { start, end };
}

// TODO: make this return TextRange
export function templatesInDocument(text: string): Template[] {
	const templateRange = sectionRange('templates', text);
	if (templateRange === undefined)
		return [];
	
	const templates = text
	.split('\n')
	.slice(templateRange.start.line, templateRange.end.line)
	.map(string => Template.fromString(string));

	return templates;
}


export function clausesInDocument(text: string): ContentRange<string>[] {
	const clauseRange = sectionRange('knowledge base', text);

	if (clauseRange === undefined)
		return [];
	
	const lines = text.split('\n');
	const clauses: ContentRange<string>[] = [];
	const clauseStartPattern = /^[^\s].*$/;
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
	const connectives = /\b(?:if|and|or|it is the case that|it is not the case that)\b/g;
	const lines = clause.content.split('\n');
	const literalsWithRanges: ContentRange<string>[] = [];

	for (let lineOffset = 0; lineOffset < lines.length; lineOffset++) {
		const lineNumber = clause.range.start.line + lineOffset;
		const literalsInLine = lines[lineOffset].split(connectives)
		.map(lit => lit.trim())
		.filter(lit => lit.length > 0);

		literalsInLine.forEach(lit => {
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


// export function literalsInDocument(text: string): ContentRange<string>[] {
// 	const knowledgeBase = sectionRange('knowledge base', text);
// 	if (knowledgeBase === undefined)
// 		return [];

// 	const connectives = /\b(?:if|and|or|it is the case that|it is not the case that)\b/g;
// 	const lines = text.split('\n');

// 	const literalsWithRanges: ContentRange<string>[] = [];
// 	for (let l = knowledgeBase.start.line; l <= Math.min(knowledgeBase.end.line, lines.length - 1); l++) {
// 		const literalsInLine = lines[l].split(connectives)
// 		.map(lit => lit.trim())
// 		.filter(lit => lit.length > 0);

// 		literalsInLine.forEach(lit => {
// 			const range: Range = {
// 				start: {
// 					line: l,
// 					character: lines[l].indexOf(lit)
// 				},
// 				end: {
// 					line: l,
// 					character: lines[l].indexOf(lit) + lit.length
// 				}
// 			};
// 			literalsWithRanges.push({
// 				content: lit,
// 				range
// 			});
// 		});
// 	}

// 	return literalsWithRanges;
// }


export function literalsInDocument(text: string): ContentRange<string>[] {
	return clausesInDocument(text)
	.flatMap(clause => literalsInClause(clause));
}


export function intersectionOf<T>(lists: T[][]): T[] {
	const allElements: T[] = [];
	for (const el of lists[0]) {
		if (lists.every(list => list.includes(el)))
			allElements.push(el);
	}
	// allElements is now a list of each element from each list

	const intersection: T[] = [];
	allElements.forEach(el => {
		if (lists.every(list => list.includes(el)))
			intersection.push(el);
	});

	return intersection;
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