# How to run the codemirror client
## Build the LE language server
In `language-server/logical-english/server`, run `sudo npm link`
This produces `lsp-sample-server` executable

## Run the LE language server with websocket
Make sure `lsp-ws-proxy` is installed.
From any folder, run `lsp-ws-proxy --listen 8888 -- lsp-sample-server --stdio` 
This makes lsp-ws-proxy listen on port `ws://0.0.0.0:8888`, passing communication to `lsp-sample-server` via standard I/O

## Run the Code Mirror front-end
Navigate to `codemirror-client/frontend`. In `index.ts`, make sure that the `ILspOptions` object 
```
{
    serverUri: 'ws://0.0.0.0:8888/',
    languageId: 'logical-english',
    ...
}
```
is passed to `new LspWsConnection(...)` to connect to server.
Run the front-end with `npm run start`. For this to work, you may have to first run 
`export NODE_OPTIONS=--openssl-legacy-provider`

## Test that everything is working
Open the codemirror frontend on `localhost:4000`
Currently, the Logical English
```
the templates are:
*a person* likes *an object*

the knowledge base subset includes:
smith likes apples if
  	bob really hates pears
```
has the last literal (bob really hates pears) highlighted in red, with the error `Literal has no template.` shown on the side.