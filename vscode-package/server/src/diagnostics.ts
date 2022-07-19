import {
	Diagnostic,
	DiagnosticSeverity
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { 
	templatesInDocument, 
	literalsInDocument, 
	clausesInDocument, 
	ignoreComments, 
	termsInClause, 
	typeTreeInDocument 
} from './utils';
import { Template } from './template';
import { Type, TypeTree } from './type';

export interface ExampleSettings {
	maxNumberOfProblems: number;
}

export const globalSettings: ExampleSettings = {
	maxNumberOfProblems: 1000
};

export const literalHasNoTemplateMessage = "Literal has no template.";
export const clauseHasMisalignedConnectivesMessage = 'Clause has misaligned connectives.';

export function textDocumentDiagnostics(document: TextDocument): Diagnostic[] {	
	// debugOnStart();
	const typeCheckingRegex = /^.*(%type checking:? on)\s*$/gm;
	let text = document.getText();
	const typeChecking = typeCheckingRegex.test(text);
	text = ignoreComments(text);

	const typeTree = typeTreeInDocument(text);

	const diags = [];
	diags.push(... literalHasNoTemplateDiags(text, typeTree));
	diags.push(...misalignedConnectivesDiags(text));


	if (typeChecking) 
		diags.push(...typeMismatchDiags(text, typeTree));

	return diags;
}


export function debugOnStart() {
	0;
}


// refactor to export function text -> literals with no template
function literalHasNoTemplateDiags(text: string, typeTree: TypeTree): Diagnostic[] {
	const templates = templatesInDocument(text);

	const diagnostics: Diagnostic[] = [];	
	for (const { content: literal, range } of literalsInDocument(text))
		if (!templates.some(template => template.matchesLiteral(literal)))
			diagnostics.push({
				severity: DiagnosticSeverity.Warning,
				range,
				message: literalHasNoTemplateMessage
			});

	return diagnostics;
}


function misalignedConnectivesDiags(text: string): Diagnostic[] {
	const diagnostics: Diagnostic[] = [];

	for (const { content: clause, range } of clausesInDocument(text)) {
		if (clauseHasMisalignedConnectives(clause)) {
			diagnostics.push({
				severity: DiagnosticSeverity.Warning,
				range,
				message: clauseHasMisalignedConnectivesMessage
			});
		}
	}

	return diagnostics;
}

function typeMismatchDiags(text: string, typeTree: TypeTree): Diagnostic[] {
	const diagnostics: Diagnostic[] = [];
	const templates = templatesInDocument(text);

	for (const clause of clausesInDocument(text)) {
		const terms = termsInClause(templates, clause);
		for (let i = 0; i < terms.length; i++) {
			for (let j = i + 1; j < terms.length; j++) {
				if (terms[i].content.name === terms[j].content.name && terms[i].content.type !== terms[j].content.type) {
					const message = `Type mismatch: '${terms[i].content.type.name}' versus '${terms[j].content.type.name}'`;
					for (const range of [terms[i].range, terms[j].range]) {
						if (!diagnostics.some(diag => diag.range === range)) {
							diagnostics.push({
								severity: DiagnosticSeverity.Warning,
								range,
								message
							});
						}
					}
				}
			}
		}
	}

	return diagnostics;
}


function clauseHasMisalignedConnectives(clause: string): boolean {
	const connectives = [
		'and',
		'or'
	];

	const lines = clause.split(/\n+/g);
	const startsWith = (idx: number, conn: string) => 
		lines[idx].trimStart().startsWith(conn);

	for (let i = 0; i < lines.length; i++) {
		const connective = connectives.find(conn => startsWith(i, conn));
		if (connective !== undefined) {
			const indentation = lines[i].split(connective)[0];
			for (let j = i + 1; j < lines.length; j++) {
				const otherConnective = connectives.find(conn => conn !== connective && startsWith(j, conn));
				if (otherConnective !== undefined) {
					const otherIndentation = lines[j].split(otherConnective)[0];
					if (indentation === otherIndentation)
						return true;
				}
			}
		}
	}

	return false;
}