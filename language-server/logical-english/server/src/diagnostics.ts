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
import { templatesInDocument, literalsInDocument } from './utils';

export interface ExampleSettings {
	maxNumberOfProblems: number;
}

export const globalSettings: ExampleSettings = {
	maxNumberOfProblems: 1000
};

export const literalHasNoTemplateMessage = "Literal has no template.";

export function textDocumentDiagnostics(hasDiagnosticRelatedInformationCapability: boolean, maxNumberOfProblems: number, document: TextDocument): Diagnostic[] {
	const bannedWords = bannedWordDiagnostics(document);
	const literalHasNoTemplate = literalHasNoTemplateDiagnostics(document);
	return [
		...bannedWords,
		...literalHasNoTemplate
	]
	.slice(0, maxNumberOfProblems);
}


function bannedWordDiagnostics(document: TextDocument): Diagnostic[] {
	const text = document.getText();
	const pattern = /\b(foo|bar)\b/g;
	let m: RegExpExecArray | null;

	let problems = 0;
	const diagnostics: Diagnostic[] = [];
	while ((m = pattern.exec(text))) {
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
		
		// if (hasDiagnosticRelatedInformationCapability) {
		// 	diagnostic.relatedInformation = [
		// 		{
		// 			location: {
		// 				uri: document.uri,
		// 				range: Object.assign({}, diagnostic.range)
		// 			},
		// 			message: 'Here is where I would put some extra info...'
		// 		},
		// 		{
		// 			location: {
		// 				uri: document.uri,
		// 				range: Object.assign({}, diagnostic.range)
		// 			},
		// 			message: '...that is asynchronously loaded in after an error has been detected.'
		// 		}
		// 	];
		// }
		diagnostics.push(diagnostic);
	}

	return diagnostics;
}


function literalHasNoTemplateDiagnostics(document: TextDocument): Diagnostic[] {
	const templates = templatesInDocument(document);
	const literals = literalsInDocument(document);

	const diagnostics: Diagnostic[] = [];
	literals.forEach(literal => {
		if (!templates.some(template => template.matchesLiteral(literal))) {
			const literalPos = document.getText().match(literal)?.index;
			if (literalPos !== undefined) {
				diagnostics.push({
					severity: DiagnosticSeverity.Warning,
					range: {
						start: document.positionAt(literalPos),
						end: document.positionAt(literalPos + literal.length)
					},
					message: literalHasNoTemplateMessage
				});
			}
		}
	});

	return diagnostics;
}