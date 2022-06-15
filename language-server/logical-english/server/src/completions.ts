import { TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionItem, CompletionItemKind, /* InsertReplaceEdit,*/ TextDocumentPositionParams } from "vscode-languageserver";
// import { literalAtPosition, sectionRange, templatesInDocument } from './utils';
// import { InsertTextFormat } from 'vscode-languageclient';


export function provideCompletions(document: TextDocument, params: TextDocumentPositionParams): CompletionItem[] {	
	return [
		// ...literalCompletion(document, params),
		...dummyCompletion()
	];
}


// function literalCompletion(document: TextDocument, params: TextDocumentPositionParams): CompletionItem[] {
// 	const knowledgeBaseRange = sectionRange('knowledge base', document);
// 	if (knowledgeBaseRange === undefined 
// 			|| params.position.line < knowledgeBaseRange.start.line 
// 			|| params.position.line > knowledgeBaseRange.end.line) 
// 		return [];
	
// 	const templates = templatesInDocument(document);

// 	const line = document.getText().split('\n')[params.position.line];
// 	const literal = literalAtPosition(line, params.position.character);
// 	if (literal === undefined)
// 		return [];
	
// 	const completions: CompletionItem[] = [];
// 	templates.forEach(template => {
// 		if (template.matchesIncompleteLiteral(literal))
// 			completions.push({
// 				label: template.toSnippet(),
// 				kind: CompletionItemKind.Text,
// 				insertTextFormat: InsertTextFormat.Snippet
// 			});
// 	});

// 	return completions;
// }

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