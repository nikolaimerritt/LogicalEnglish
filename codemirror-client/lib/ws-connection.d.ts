/// <reference types="node" />
import * as events from 'events';
import * as lsProtocol from 'vscode-languageserver-protocol';
import { ILspConnection, ILspOptions, IPosition, ITokenInfo } from './types';
declare class LspWsConnection extends events.EventEmitter implements ILspConnection {
    private isConnected;
    private isInitialized;
    private socket;
    private documentInfo;
    private serverCapabilities;
    private documentVersion;
    private connection;
    constructor(options: ILspOptions);
    /**
     * Initialize a connection over a web socket that speaks the LSP protocol
     */
    connect(socket: WebSocket): this;
    close(): void;
    getDocumentUri(): string;
    sendInitialize(): void;
    sendChange(): void;
    getHoverTooltip(location: IPosition): void;
    getCompletion(location: IPosition, token: ITokenInfo, triggerCharacter?: string, triggerKind?: lsProtocol.CompletionTriggerKind): void;
    getDetailedCompletion(completionItem: lsProtocol.CompletionItem): void;
    getSignatureHelp(location: IPosition): void;
    /**
     * Request the locations of all matching document symbols
     */
    getDocumentHighlights(location: IPosition): void;
    /**
     * Request a link to the definition of the current symbol. The results will not be displayed
     * unless they are within the same file URI
     */
    getDefinition(location: IPosition): void;
    /**
     * Request a link to the type definition of the current symbol. The results will not be displayed
     * unless they are within the same file URI
     */
    getTypeDefinition(location: IPosition): void;
    /**
     * Request a link to the implementation of the current symbol. The results will not be displayed
     * unless they are within the same file URI
     */
    getImplementation(location: IPosition): void;
    /**
     * Request a link to all references to the current symbol. The results will not be displayed
     * unless they are within the same file URI
     */
    getReferences(location: IPosition): void;
    /**
     * The characters that trigger completion automatically.
     */
    getLanguageCompletionCharacters(): string[];
    /**
     * The characters that trigger signature help automatically.
     */
    getLanguageSignatureCharacters(): string[];
    /**
     * Does the server support go to definition?
     */
    isDefinitionSupported(): boolean;
    /**
     * Does the server support go to type definition?
     */
    isTypeDefinitionSupported(): boolean;
    /**
     * Does the server support go to implementation?
     */
    isImplementationSupported(): boolean;
    /**
     * Does the server support find all references?
     */
    isReferencesSupported(): boolean;
}
export default LspWsConnection;
