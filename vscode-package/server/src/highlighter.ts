// Minimum Working Example based on https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide
// and on https://github.com/microsoft/vscode-extension-samples/blob/main/semantic-tokens-sample/src/extension.ts

import {
	SemanticTokenModifiers,
	SemanticTokens,
    SemanticTokensLegend,
	SemanticTokensBuilder,
	SemanticTokenTypes
} from "vscode-languageserver";

import { TextDocument } from "vscode-languageserver-textdocument";


export const tokenTypes = ['class', 'interface'];
export const tokenModifiers = ['declaration', 'implementation'];

export function semanticTokens(document: TextDocument): SemanticTokens {
    const builder = new SemanticTokensBuilder();

    const tokenDetails = {
        line: 1,
        char: 1, 
        length: 10,
        tokenType: 0,
        tokenModifiers: 0
    };
    builder.push(tokenDetails.line, tokenDetails.char, tokenDetails.length, tokenDetails.tokenType, tokenDetails.tokenModifiers);

    return builder.build();
}