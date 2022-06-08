import { CodeAction, CodeActionParams, DiagnosticSeverity, CodeActionKind } from 'vscode-languageserver';
import {
	TextDocument
} from 'vscode-languageserver-textdocument';

export function refactor(textDocument: TextDocument, params: CodeActionParams): CodeAction[] {
	const codeActions: CodeAction[] = [];

	params.context.diagnostics.forEach((diag) => {
		if (diag.severity === DiagnosticSeverity.Error && diag.message.includes('is a banned word')) {
			codeActions.push({
				title: "Add an underscore at the start.",
				kind: CodeActionKind.QuickFix,
				diagnostics: [diag],
				edit: {
					changes: {
						[params.textDocument.uri]: [{
							range: diag.range, 
							newText: "_" + textDocument.getText(diag.range)
						}]
					}
				}
			});
			return;
		}
	});

	return codeActions;
}