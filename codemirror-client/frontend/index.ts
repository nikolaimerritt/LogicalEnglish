import CodeMirror from 'codemirror';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/htmlmixed/htmlmixed';
import 'codemirror/mode/css/css';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/idea.css';
// The plugin currently requires the show-hint extension from CodeMirror, which must be
// installed by the app that uses the LSP connection
import 'codemirror/addon/hint/show-hint.css';
import 'codemirror/addon/hint/show-hint';
import '../src/codemirror-lsp.css';
import { LspWsConnection, CodeMirrorAdapter } from '../lib/index';

import { loadWASM } from 'onigasm';
import { addGrammar, activateLanguage } from 'codemirror-textmate';
import logicalEnglishHighlighting from './logical-english.tmLanguage.json';
import { IRawGrammar } from 'monaco-textmate';

let sampleJs = `
let values = [15, 2, 7, 9, 17, 99, 50, 3];
let total = 0;

for (let i; i < values.length; i++) {
  total += values[i];
}
`;

let sampleHtml = `
<html>
  <head>
    <title>Page Title</title>
  </head>
  <body>
    <h1>Basic HTML</h1>
  </body>
</html>
`;

let sampleCss = `
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

.header {
  color: blue;
}
`;

let htmlEditor = CodeMirror(document.querySelector('.html'), {
  theme: 'idea',
  lineNumbers: true,
  mode: 'htmlmixed',
  value: sampleHtml,
  gutters: ['CodeMirror-lsp'],
});

let cssEditor = CodeMirror(document.querySelector('.css'), {
  theme: 'idea',
  lineNumbers: true,
  mode: 'css',
  value: sampleCss,
  gutters: ['CodeMirror-lsp'],
});

let jsEditor = CodeMirror(document.querySelector('.js'), {
  theme: 'idea',
  lineNumbers: true,
  mode: 'javascript',
  value: sampleJs,
  gutters: ['CodeMirror-lsp'],
});

interface lspServerOptions {
  rootPath: string;
  htmlPath: string;
  cssPath: string;
  jsPath: string;
}

let html = {
  serverUri: 'ws://localhost:3000/html',
  languageId: 'html',
  rootUri: (window as any).lspOptions.rootPath,
  documentUri: (window as any).lspOptions.htmlPath,
  documentText: () => htmlEditor.getValue(),
};

// To make this listen to lsp-sample-server, run 
// lsp-ws-proxy --listen 8888 -- lsp-sample-server --stdio
// logical-english/server folder needs to be `sudo npm link`ed, which should output
// lsp-sample-server
let js = {
  serverUri: 'ws://0.0.0.0:8888/',// 'ws://localhost:3000/javascript',
  languageId: 'logical-english',
  rootUri: (window as any).lspOptions.rootPath,
  documentUri: (window as any).lspOptions.jsPath,
  documentText: () => jsEditor.getValue(),
};

let css = {
  serverUri: 'ws://localhost:3000/css',
  languageId: 'css',
  rootUri: (window as any).lspOptions.rootPath,
  documentUri: (window as any).lspOptions.cssPath,
  documentText: () => cssEditor.getValue(),
};

let htmlConnection = new LspWsConnection(html).connect(new WebSocket(html.serverUri));
let htmlAdapter = new CodeMirrorAdapter(htmlConnection, {
  quickSuggestionsDelay: 100,
}, htmlEditor);
let cssConnection = new LspWsConnection(css).connect(new WebSocket(css.serverUri));
let cssAdapter = new CodeMirrorAdapter(cssConnection, {
  quickSuggestionsDelay: 100,
}, cssEditor);
let jsConnection = new LspWsConnection(js).connect(new WebSocket(js.serverUri));
let jsAdapter = new CodeMirrorAdapter(jsConnection, {
  quickSuggestionsDelay: 50,
}, jsEditor);


(async () => {
    // await loadWASM(
    //     // webpack has been configured to resolve `.wasm` files to actual 'paths" as opposed to using the built-in wasm-loader
    //     // oniguruma is a low-level library and stock wasm-loader isn't equipped with advanced low-level API's to interact with libonig
    //     require('onigasm/lib/onigasm.wasm'))

    const grammar = {
        /**
         * This the most resource efficient way to load grammars as of yet
         */
        loader: () => import('./logical-english.tmLanguage.json'),
        /**
         * Language ID is only necessary for languages you want to use as CodeMirror mode (eg: cm.setOption('mode', 'javascript'))
         * To do that, we use `activatelanguage`, which will link one scope name to a language ID (also known as "mode")
         * 
         * Grammar dependencies don't need to be "activated", just "adding/registering" them is enough (using `addGrammar`)
         */
        language: 'logical-english',

        /**
         * Third parameter accepted by `activateLanguage` to specify language loading priority
         * Loading priority can be 'now' | 'asap' | 'defer' (default)
         * 
         *  - [HIGH] 'now' will cause the language (and it's grammars) to load/compile right away (most likely in the next event loop)
         *  - [MED]  'asap' is like 'now' but will use `requestIdleCallback` if available (fallbacks to `setTimeout`, 10 seconds).
         *  - [LOW]  'defer' will only do registeration and loading/compiling is deferred until needed (⚠ WILL CAUSE FOUC IN CODEMIRROR) (DEFAULT)
         */
        priority: 'now',
        scopeName: 'source.logical-english'
    }

    // To avoid FOUC, await for high priority languages to get ready (loading/compiling takes time, and it's an async process for which CM won't wait)
    const { loader, language, priority, scopeName } = grammar;

    addGrammar('source.logical-english', loader as unknown as Promise<IRawGrammar>)
    if (language) {
        const prom = activateLanguage(scopeName, language, 'now');
        await prom;
    }

    // const editor = CodeMirror.fromTextArea(document.getElementById('cm-host') as HTMLTextAreaElement, {
    //     lineNumbers: true,
    //     // If you know in advance a language is going to be set on CodeMirror editor and it isn't preloaded by setting the third argument 
    //     // to `activateLanguage` to 'now', the contents of the editor would start of and remain as unhighlighted text, until loading is complete
    //     mode: 'typescript'
    // })
    // editor.setValue((await import('./modeSamples/typescript')).default)
})()