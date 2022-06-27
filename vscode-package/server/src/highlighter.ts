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
import { ignoreComments, literalsInDocument, templatesInDocument } from './utils';


export const tokenTypes = ['variable', 'class', 'interface'];
export const tokenModifiers = ['declaration', 'implementation'];

interface TokenDetails {
    line: number,
    char: number,
    length: number,
    tokenTypeName: string,
    tokenModifierName: string | null
}

export function semanticTokens(document: TextDocument): SemanticTokens {
    const text = ignoreComments(document.getText());
    const builder = new SemanticTokensBuilder();

    // const tokenDetails = {
    //     line: 1,
    //     char: 1, 
    //     length: 10,
    //     tokenType: encodeTokenType('class'),
    //     tokenModifiers: encodeTokenModifier('declaration')
    // };
    // builder.push(tokenDetails.line, tokenDetails.char, tokenDetails.length, tokenDetails.tokenType, tokenDetails.tokenModifiers);

    terminLiteralTokens(text).forEach(token => {
        const { line, char, length, tokenTypeName, tokenModifierName } = token;
        builder.push(line, char, length, encodeTokenType(tokenTypeName), encodeTokenModifier(tokenModifierName));
    });

    return builder.build();
}


function terminLiteralTokens(text: string): TokenDetails[] {
    const templates = templatesInDocument(text);
    const tokens: TokenDetails[] = [];
    
    // eslint-disable-next-line prefer-const
    for (let { content: literal, range } of literalsInDocument(text)) {
        const template = templates.find(template => template.matchesLiteral(literal));
        if (template !== undefined) {
            const terms = template.termsFromLiteral(literal);
            
            let char = 0;
            for (const term of terms) {
                char += literal.indexOf(term);
                tokens.push({
                    line: range.start.line,
                    char,
                    length: term.length,
                    tokenTypeName: 'variable',
                    tokenModifierName: null
                });
                literal = literal.slice(char, undefined);
            }
        }
    }

    return tokens;
}


function encodeTokenType(type: string): number {
    if (tokenTypes.includes(type))
        return tokenTypes.indexOf(type);
    
    return tokenTypes.length + 2;
}

function encodeTokenModifier(modifier: string | null): number {
    if (modifier === null)
        return 0;

    if (tokenModifiers.includes(modifier))
        return tokenModifiers.indexOf(modifier);
    
    return tokenModifiers.length + 2;
}