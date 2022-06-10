import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult,
	CodeActionParams,
	CodeAction
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position, Range } from 'vscode-languageserver';
import { quickfixes } from "./quickfixes";
import { Template } from './template';

export interface ExampleSettings {
	maxNumberOfProblems: number;
}

export const globalSettings: ExampleSettings = {
	maxNumberOfProblems: 1000
};

export function textDocumentDiagnostics(hasDiagnosticRelatedInformationCapability: boolean, maxNumberOfProblems: number, document: TextDocument): Diagnostic[] {
	const bannedWords = bannedWordDiagnostics(hasDiagnosticRelatedInformationCapability, maxNumberOfProblems, document);
	return bannedWords;
}


function bannedWordDiagnostics(hasDiagnosticRelatedInformationCapability: boolean, maxNumberOfProblems: number, document: TextDocument): Diagnostic[] {
	const text = document.getText();
	const pattern = /\b(foo|bar)\b/g;
	let m: RegExpExecArray | null;

	let problems = 0;
	const diagnostics: Diagnostic[] = [];
	while ((m = pattern.exec(text)) && problems < maxNumberOfProblems) {
		problems++;
		const diagnostic: Diagnostic = {
			severity: DiagnosticSeverity.Error,
			range: {
				start: document.positionAt(m.index),
				end: document.positionAt(m.index + m[0].length)
			},
			message: `${m[0]} is a banned word.`,
			source: 'ex'
		};
		
		if (hasDiagnosticRelatedInformationCapability) {
			diagnostic.relatedInformation = [
				{
					location: {
						uri: document.uri,
						range: Object.assign({}, diagnostic.range)
					},
					message: 'Here is where I would put some extra info...'
				},
				{
					location: {
						uri: document.uri,
						range: Object.assign({}, diagnostic.range)
					},
					message: '...that is asynchronously loaded in after an error has been detected.'
				}
			];
		}
		diagnostics.push(diagnostic);
	}

	return diagnostics;
}


function sectionRange(headerText: string, document: TextDocument): Range | undefined {
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
		end = { line: lines.length - 1, character: 0 };

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


// function literalHasNoTemplateDiagnostics(hasDiagnosticRelatedInformationCapability: boolean, maxNumberOfProblems: number, document: TextDocument): Diagnostic[] {
// 	const text = document.getText();
// 	const pattern = /\b(foo|bar)\b/g;
// 	let m: RegExpExecArray | null;

// 	let problems = 0;
// 	const diagnostics: Diagnostic[] = [];
// 	while ((m = pattern.exec(text)) && problems < maxNumberOfProblems) {
// 		problems++;
// 		const diagnostic: Diagnostic = {
// 			severity: DiagnosticSeverity.Error,
// 			range: {
// 				start: document.positionAt(m.index),
// 				end: document.positionAt(m.index + m[0].length)
// 			},
// 			message: `${m[0]} is a banned word.`,
// 			source: 'ex'
// 		};
		
// 		if (hasDiagnosticRelatedInformationCapability) {
// 			diagnostic.relatedInformation = [
// 				{
// 					location: {
// 						uri: document.uri,
// 						range: Object.assign({}, diagnostic.range)
// 					},
// 					message: 'Here is where I would put some extra info...'
// 				},
// 				{
// 					location: {
// 						uri: document.uri,
// 						range: Object.assign({}, diagnostic.range)
// 					},
// 					message: '...that is asynchronously loaded in after an error has been detected.'
// 				}
// 			];
// 		}
// 		diagnostics.push(diagnostic);
// 	}

// 	return diagnostics;
// }