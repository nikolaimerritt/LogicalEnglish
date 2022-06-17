import { TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionItem, CompletionItemKind, /* InsertReplaceEdit,*/ TextDocumentPositionParams, InsertTextFormat } from "vscode-languageserver";
import { literalAtPosition, sectionRange, templatesInDocument } from './utils';


export function provideCompletions(document: TextDocument, params: TextDocumentPositionParams): CompletionItem[] {	
	return [
		...literalCompletion(document, params),
		...dummyCompletion()
	];
}


function literalCompletion(document: TextDocument, params: TextDocumentPositionParams): CompletionItem[] {
	const knowledgeBaseRange = sectionRange('knowledge base', document);
	if (knowledgeBaseRange === undefined 
			|| params.position.line < knowledgeBaseRange.start.line 
			|| params.position.line > knowledgeBaseRange.end.line) 
		return [];
	
	const templates = templatesInDocument(document);

	const line = document.getText().split('\n')[params.position.line];
	const literal = literalAtPosition(line, params.position.character);
	if (literal === undefined)
		return [];
	
	const completions: CompletionItem[] = [];
	templates.forEach(template => {
		if (template.matchScore(literal) > 0)
			completions.push({
				label: template.toString(),
				kind: CompletionItemKind.Class,
				insertTextFormat: InsertTextFormat.Snippet,
				insertText: template.toSnippet(),
				sortText: template.matchScore(literal).toString()
			});
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
		}
	];
}