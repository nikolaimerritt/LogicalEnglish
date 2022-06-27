import { CodeAction, CodeActionParams, DiagnosticSeverity, CodeActionKind, Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Template } from './template';
import { literalHasNoTemplateMessage } from './diagnostics';
import { literalsInDocument, sectionRange, templatesInDocument, clausesInDocument } from './utils';

import { debugOnStart } from './diagnostics';

// adapted from https://github.com/YuanboXue-Amber/endevor-scl-support/blob/master/server/src/CodeActionProvider.ts

export function quickfixes(document: TextDocument, params: CodeActionParams): CodeAction[] {
	// debugOnStart();
	
	return [
		...literalWithNoTemplateFixes(document, params)
	];
}




function literalWithNoTemplateFixes(document: TextDocument, params: CodeActionParams): CodeAction[] {
	const actions: CodeAction[] = [];
	const text = document.getText();
	const templates = templatesInDocument(text);
	const literalsWithNoTemplate = literalsInDocument(text)
	.map(textRange => textRange.content)
	.filter(literal => !templates.some(template => template.matchesLiteral(literal)));

	if (literalsWithNoTemplate.length === 0)
		return [];
	
	const lggTemplate = Template.fromLGG(literalsWithNoTemplate);
	if (lggTemplate === undefined)
		return [];
	
	const templatesRange = sectionRange('templates', text);
	if (templatesRange === undefined)
		return [];
	
	const endOfTemplates: Range = {
		start: templatesRange.end,
		end: templatesRange.end
	};
	
	
	params.context.diagnostics.forEach(diag => {
		if (diag.severity === DiagnosticSeverity.Warning && diag.message.includes(literalHasNoTemplateMessage)) {
			actions.push({
				title: 'Generate a template',
				kind: CodeActionKind.QuickFix,
				diagnostics: [diag],
				edit: {
					changes: {
						[params.textDocument.uri]: [{
							range: endOfTemplates,
							newText: `${lggTemplate.toString()} \n`
						}]
					}
				}
			});
		}
	});

	return actions;
}