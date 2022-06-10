import { CodeAction, CodeActionParams, DiagnosticSeverity, CodeActionKind, Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Template } from './template';
import { literalHasNoTemplateMessage } from './diagnostics';
import { literalsInDocument, sectionRange, templatesInDocument } from './utils';

// adapted from https://github.com/YuanboXue-Amber/endevor-scl-support/blob/master/server/src/CodeActionProvider.ts

export function quickfixes(document: TextDocument, params: CodeActionParams): CodeAction[] {
	const literal = 'bob spence likes shoes for five pounds';
	const terms = ['bob spence', 'shoes', 'five pounds'];
	console.log("Template from literal + terms:");
	console.log(Template.fromLiteral(literal, terms));

	return [
		...bannedWordFixes(document, params),
		...literalWithNoTemplateFixes(document, params)
	];
}


function bannedWordFixes(document: TextDocument, params: CodeActionParams): CodeAction[] {
	const actions: CodeAction[] = [];
	
	params.context.diagnostics.forEach(diag => {
		if (diag.severity === DiagnosticSeverity.Error && diag.message.includes('is a banned word')) {
			actions.push({
				title: "Add an underscore at the start.",
				kind: CodeActionKind.QuickFix,
				diagnostics: [diag],
				edit: {
					changes: {
						[params.textDocument.uri]: [{
							range: diag.range, 
							newText: '# hello #'
						}]
					}
				}
			});
		}
	});

	return actions;
}


function literalWithNoTemplateFixes(document: TextDocument, params: CodeActionParams): CodeAction[] {
	const actions: CodeAction[] = [];
	const templates = templatesInDocument(document);
	const literalsWithNoTemplate = literalsInDocument(document)
	.filter(literal => !templates.some(template => template.matchesLiteral(literal)));

	if (literalsWithNoTemplate.length === 0)
		return [];
	
	const lggTemplate = Template.fromLggOf(literalsWithNoTemplate);
	if (lggTemplate === undefined)
		return [];
	
	const endOfTemplates = sectionRange('templates', document);
	if (endOfTemplates === undefined)
		return [];
	
	
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
							newText: lggTemplate.toString()
						}]
					}
				}
			});
		}
	});

	return actions;
}