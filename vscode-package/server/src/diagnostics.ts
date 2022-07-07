import {
	Diagnostic,
	DiagnosticSeverity
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { templatesInDocument, literalsInDocument, clausesInDocument, ignoreComments } from './utils';
import { Template } from './template';
import { cpSync } from 'fs';

export interface ExampleSettings {
	maxNumberOfProblems: number;
}

export const globalSettings: ExampleSettings = {
	maxNumberOfProblems: 1000
};

export const literalHasNoTemplateMessage = "Literal has no template.";
export const clauseHasMisalignedConnectivesMessage = 'Clause has misaligned connectives.';

export function textDocumentDiagnostics(maxNumberOfProblems: number, document: TextDocument): Diagnostic[] {	
	debugOnStart();
	const text = ignoreComments(document.getText());

	return [
		... literalHasNoTemplateDiags(text),
		...misalignedConnectivesDiags(text)
	]
	.slice(0, maxNumberOfProblems);
}


export function debugOnStart() {
	const literals = [
		'the big mother of the ugly person is unknown',
		'the very large father of the hateful person is your dad'
	];
	console.log('Template:');
	console.log(Template.fromLGG(literals));
}


// refactor to export function text -> literals with no template
function literalHasNoTemplateDiags(text: string): Diagnostic[] {
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