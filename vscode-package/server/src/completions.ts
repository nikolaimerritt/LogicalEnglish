import { Position, Range, TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionItem, CompletionItemKind, /* InsertReplaceEdit,*/ TextDocumentPositionParams, InsertTextFormat, InsertReplaceEdit, TextEdit } from "vscode-languageserver";
import { literalAtPosition, sectionRange, templatesInDocument } from './utils';


export function provideCompletions(document: TextDocument, params: TextDocumentPositionParams): CompletionItem[] {	
	const text = document.getText();
	return [
		...literalCompletion(text, params),
		...dummyCompletion()
	];
}


function literalCompletion(text: string, params: TextDocumentPositionParams): CompletionItem[] {
	const knowledgeBaseRange = sectionRange('knowledge base', text);
	if (knowledgeBaseRange === undefined 
			|| params.position.line < knowledgeBaseRange.start.line 
			|| params.position.line > knowledgeBaseRange.end.line) 
		return [];
	
	const templates = templatesInDocument(text);

	const line = text.split('\n')[params.position.line];
	const literal = literalAtPosition(line, params.position.character);
	if (literal === undefined)
		return [];

	const literalStart: Position = {
		line: params.position.line,
		character: line.indexOf(literal)
	};

	const literalEnd: Position = {
		line: params.position.line,
		character: line.indexOf(literal) + literal.length + 1
	};

	const literalToEndOfLine: Range = {
		start: literalStart,
		end: literalEnd
	};

	const completions: CompletionItem[] = [];
	templates.forEach(template => {
		if (template.matchScore(literal) > 0) {
			const templateWithMissingTerms = template.templateWithMissingTerms(literal);
			const textEdit = TextEdit.replace(literalToEndOfLine, templateWithMissingTerms.toSnippet());

			completions.push({
				label: templateWithMissingTerms.toString(),
				kind: CompletionItemKind.Class,
				insertTextFormat: InsertTextFormat.Snippet,
				textEdit,
				sortText: template.matchScore(literal).toString(),
			});
		}			
	});

	return completions;
}

function dummyCompletion(): CompletionItem[] {
	return [
		{
			label: 'TypeScript',
			kind: CompletionItemKind.Text,
			data: 1
		},
		{
			label: 'JavaScript',
			kind: CompletionItemKind.Text,
			data: 2
		},
		{
			label: 'LogicalEnglish',
			kind: CompletionItemKind.Text,
			data: 3
		}
	];
}