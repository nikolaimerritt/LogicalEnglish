/// <reference types="@types/codemirror" />
/// <reference types="@types/codemirror/codemirror-showhint" />
import * as lsProtocol from 'vscode-languageserver-protocol';
import { Location, LocationLink } from 'vscode-languageserver-protocol';
import { IEditorAdapter, ILspConnection, ITextEditorOptions } from './types';
declare class CodeMirrorAdapter extends IEditorAdapter<CodeMirror.Editor> {
    options: ITextEditorOptions;
    editor: CodeMirror.Editor;
    connection: ILspConnection;
    private hoverMarker;
    private signatureWidget;
    private token;
    private markedDiagnostics;
    private highlightMarkers;
    private hoverCharacter;
    private debouncedGetHover;
    private connectionListeners;
    private editorListeners;
    private documentListeners;
    private tooltip;
    private isShowingContextMenu;
    constructor(connection: ILspConnection, options: ITextEditorOptions, editor: CodeMirror.Editor);
    handleMouseOver(ev: MouseEvent): void;
    handleChange(cm: CodeMirror.Editor, change: CodeMirror.EditorChange): void;
    handleHover(response: lsProtocol.Hover): void;
    handleHighlight(items: lsProtocol.DocumentHighlight[]): void;
    handleCompletion(completions: lsProtocol.CompletionItem[]): void;
    handleDiagnostic(response: lsProtocol.PublishDiagnosticsParams): void;
    handleSignature(result: lsProtocol.SignatureHelp): void;
    handleGoTo(location: Location | Location[] | LocationLink[] | null): void;
    remove(): void;
    private _addListeners;
    private _getTokenEndingAtPosition;
    private _getFilteredCompletions;
    private _isEventInsideVisible;
    private _isEventOnCharacter;
    private _handleRightClick;
    private _handleClickOutside;
    private _showTooltip;
    private _removeTooltip;
    private _removeSignatureWidget;
    private _removeHover;
    private _highlightRanges;
}
export default CodeMirrorAdapter;
