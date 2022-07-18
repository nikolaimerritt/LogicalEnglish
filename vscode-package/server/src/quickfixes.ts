import { CodeAction, CodeActionParams, DiagnosticSeverity, CodeActionKind, Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Template } from './template';
import { literalHasNoTemplateMessage } from './diagnostics';
import { literalsInDocument, sectionRange, templatesInDocument, clausesInDocument, ignoreComments, ContentRange, literalsInClause, typeTreeInDocument } from './utils';

import { debugOnStart } from './diagnostics';
import { Term } from './term';

// adapted from https://github.com/YuanboXue-Amber/endevor-scl-support/blob/master/server/src/CodeActionProvider.ts

export function quickfixes(document: TextDocument, params: CodeActionParams): CodeAction[] {
	// debugOnStart();
	
	const text = ignoreComments(document.getText());
	console.log('Type Tree:');
	console.log(typeTreeInDocument(text));
	return [
		...literalWithNoTemplateFixes(text, params)
	];
}



function literalWithNoTemplateFixes(text: string, params: CodeActionParams): CodeAction[] {
	const templates = templatesInDocument(text);
	const typeTree = typeTreeInDocument(text);
	const literalsWithNoTemplate = literalsInDocument(text)
	.filter(literal => !templates.some(template => template.matchesLiteral(literal.content)));

	if (literalsWithNoTemplate.length < 2)
		return [];
	
	const templatesRange = sectionRange('templates', text)?.range;
	if (templatesRange === undefined)
		return [];
	
	const endOfTemplates: Range = {
		start: templatesRange.end,
		end: templatesRange.end
	};

	let generatedTemplate = Template.fromLGG(typeTree, literalsWithNoTemplate.map(lit => lit.content));
	if (generatedTemplate === undefined)
		return [];

	
	// trying to add every variable in the clauses containing the literals, to the template
	for (const literal of literalsWithNoTemplate) {
		const clause = clauseContainingLiteral(text, literal);
		if (clause !== undefined) {
			for (const term of termsInClause(templates, clause))
				generatedTemplate = generatedTemplate.withVariable(term);
		}
	}
	
	const actions: CodeAction[] = [];
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
							newText: `${generatedTemplate!.toString()}.\n` 
							// why is TypeScript saying that generatedTemplate could be undefined??
						}]
					}
				}
			});
		}
	});

	return actions;
}


function clauseContainingLiteral(document: string, literal: ContentRange<string>): ContentRange<string> | undefined {
	return clausesInDocument(document)
	.find(clause => 
			clause.range.start.line <= literal.range.start.line 
			&& clause.range.end.line >= literal.range.end.line
	);
}


function termsInClause(templates: Template[], clause: ContentRange<string>): Term[] {
	let terms: Term[] = [];
	const literals = literalsInClause(clause);

	for (const { content: literal } of literals) {
		const template = templates.find(t => t.matchesLiteral(literal));
		if (template !== undefined) 
			terms = terms.concat(template.termsFromLiteral(literal));
	}

	return terms;
}