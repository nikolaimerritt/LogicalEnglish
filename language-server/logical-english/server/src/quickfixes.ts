import { CodeAction, CodeActionParams, DiagnosticSeverity, CodeActionKind, Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Template, templateFromString } from './template';

// adapted from https://github.com/YuanboXue-Amber/endevor-scl-support/blob/master/server/src/CodeActionProvider.ts

export function quickfixes(textDocument: TextDocument, params: CodeActionParams): CodeAction[] {
	const codeActions: CodeAction[] = [];

	params.context.diagnostics.forEach((diag) => {
		const template = templateFromString("   *a happy man*   likes  to      pet   *an okay animal* with *a hand*   ");
		if (diag.severity === DiagnosticSeverity.Error && diag.message.includes('is a banned word')) {
			console.log(`Found a bad word ${textDocument.getText(diag.range)}`);
			codeActions.push({
				title: "Add an underscore at the start.",
				kind: CodeActionKind.QuickFix,
				diagnostics: [diag],
				edit: {
					changes: {
						[params.textDocument.uri]: [{
							range: findEndOfTemplates(textDocument), 
							newText: `\ntemplateName = #${template.predicateName}#\ntemplateArgs = #${template.argumentTypes}#\n`
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