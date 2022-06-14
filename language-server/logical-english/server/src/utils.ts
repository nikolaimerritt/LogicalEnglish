
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

export function literalsInDocument(document: TextDocument): string[] {
	const ruleRange = sectionRange('knowledge base', document);
	console.log('Rule range:');
	console.log(ruleRange);

	if (ruleRange === undefined)
		return [];

	const clauses = document.getText()
	.split('\n')
	.slice(ruleRange.start.line, ruleRange.end.line)
	.map(clause => clause.trim())
	.filter(clause => clause.length > 0);
	
	const connectives = /\b(?:if|and|it is the case that|it is not the case that)\b/g;
	const literals = clauses
	.flatMap(rule => rule.split(connectives))
	.map(rule => rule.trim().replace('.', ''))
	.filter(rule => rule.length > 0);

	return literals;
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