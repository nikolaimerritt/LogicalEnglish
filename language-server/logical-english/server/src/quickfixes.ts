import { CodeAction, CodeActionParams, DiagnosticSeverity, CodeActionKind, Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Template } from './template';
import { literalsInDocument, templatesInDocument } from './validation';

// adapted from https://github.com/YuanboXue-Amber/endevor-scl-support/blob/master/server/src/CodeActionProvider.ts

export function quickfixes(document: TextDocument, params: CodeActionParams): CodeAction[] {
	const codeActions: CodeAction[] = [];

	params.context.diagnostics.forEach((diag) => {
		console.log('Templates in document:');
		templatesInDocument(document).forEach(template => console.log(template.toString()));

		console.log('\n\nLiterals in document:');
		literalsInDocument(document).forEach(literal => console.log(`@${literal}@`));
		

		if (diag.severity === DiagnosticSeverity.Error && diag.message.includes('is a banned word')) {
			console.log(`Found a bad word ${document.getText(diag.range)}`);
			codeActions.push({
				title: "Add an underscore at the start.",
				kind: CodeActionKind.QuickFix,
				diagnostics: [diag],
				edit: {
					changes: {
						[params.textDocument.uri]: [{
							range: findEndOfTemplates(document), 
							newText: '# hello #'
						}]
					}
				}
			});
		}
	});

	return codeActions;
}

function findEndOfTemplates(textDocument: TextDocument): Range {
	const lines = textDocument.getText().split('\n');

	let foundTemplateHeader = false;
	let endOfTemplatesLine = -1;
	for (let i = 0; i < lines.length; i++) {
		if (foundTemplateHeader && lines[i].includes(":")) {
			endOfTemplatesLine = i;
			break;
		}

		if (!foundTemplateHeader && lines[i].includes("templates") && lines[i].includes(":")) 
			foundTemplateHeader = true;
	}

	const endOfTemplatesPosition: Position = {
		line: endOfTemplatesLine,
		character: 0
	};

	return {
		start: endOfTemplatesPosition,
		end: endOfTemplatesPosition
	};
}