
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position, Range } from 'vscode-languageserver';
import { Template } from './template';


export function sectionRange(headerText: string, document: TextDocument): Range | undefined {
	const lines = document.getText().split('\n');
	
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

export function templatesInDocument(document: TextDocument): Template[] {
	const templateRange = sectionRange('templates', document);
	if (templateRange === undefined)
		return [];
	
	const templates = document.getText()
	.split('\n')
	.slice(templateRange.start.line, templateRange.end.line)
	.map(Template.fromString);

	return templates;
}

export type TextRange = {
	text: string,
	range: Range
}

export function literalsInDocument(document: TextDocument): TextRange[] {
	const knowledgeBase = sectionRange('knowledge base', document);
	if (knowledgeBase === undefined)
		return [];

	const connectives = /\b(?:if|and|or|it is the case that|it is not the case that)\b/g;
	const lines = document.getText().split('\n');

	const literalsWithRanges: TextRange[] = [];
	for (let l = knowledgeBase.start.line; l <= Math.min(knowledgeBase.end.line, lines.length - 1); l++) {
		const literalsInLine = lines[l].split(connectives)
		.map(lit => lit.trim())
		.filter(lit => lit.length > 0);

		literalsInLine.forEach(lit => {
			const range: Range = {
				start: {
					line: l,
					character: lines[l].indexOf(lit)
				},
				end: {
					line: l,
					character: lines[l].indexOf(lit) + lit.length
				}
			};
			literalsWithRanges.push({
				text: lit,
				range
			});
		});
	}

	return literalsWithRanges;
}

export function intersectionOf<T>(lists: T[][]): T[] {
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

export function removeBlanks(words: string[]): string[] {
	return words
	.map(word => word.trim())
	.filter(word => word.length > 0);
}


export function literalAtPosition(line: string, characterOffset: number): string | undefined {
	const connectives = /\b(?:if|and|it is the case that|it is not the case that)\b/g;
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