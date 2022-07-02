# How to run the project
## Pre-requisites
You will need:
 - node (https://nodejs.org/en/download/) version 16.4.5 or newer
 - node package manager (`npm`) version 8.12.2 or newer
 - visual studio code (`code`) (https://code.visualstudio.com/download) version 1.68.1 or newer
 - lsp-ws-proxy (`lsp-ws-proxy`) (https://github.com/qualified/lsp-ws-proxy, see below) version 0.9.0 or newer
 - (to install lsp-ws-proxy) rust (https://www.rust-lang.org/tools/install), specifically `cargo`, rust's build tool, version 1.61.0 or newer

## Installing lsp-ws-proxy
To install lsp-ws-proxy, `git clone` its repository. From the `lsp-ws-proxy` root folder, run `cargo build` to build the program using Rust's build tool. The executable, `lsp-ws-proxy`, is in `target/debug`. 

## Initial set up
From the `LogicalEnglish/vscode-package` directory, run `npm install`. This installs all the node packages for the syntax highlighter, language server, and visual studio code client. 

To set up the language server for the codemirror client, from `LogicalEnglish/vscode-package/server`, run `npm link`. (You may have to run this command as `sudo`). This creates the language server as a node package called `le-server`. Test that it launches without errors by running `le-server --stdio`. (This is supposed to produce no output.)

From the `LogicalEnglish/codemirror-client` directory, run `npm install`. This installs all the node packages for the codemirror client and its frontend.


## Running the visual studio code client
From the `LogicalEnglish/vscode-package` directory, run `code .`. This launces Visual Studio Code in the `vscode-package` directory. This window, however, is for editing the project. 
To run the client, press `Run -> Start Debugging`. This launches a new Visual Studio Code window that is connected to the language server. From here, you can make a new Logical English (`your-file-name.le`) file, or open an existing file. The language server and syntax highlighter will work on these files.


## Running the codemirror client
From `LogicalEnglish/vscode-package/server`, run `lsp-ws-proxy --listen 0.0.0.0:8888 -- le-server --stdio` (notice the space between `--` and `le-server`). This launches a WebSocket proxy to the language server that listens on port `8888` of local IP `0.0.0.0`. Check that the proxy works by opening `0.0.0.0:8888` in a browser. The webpage should say "OK".

In a separate terminal, from `LogicalEnglish/codemirror-client/frontend`, run `npm run start`. (If there is an error, you may have to first run `export NODE_OPTIONS=--openssl-legacy-provider`). This starts the codemirror client on `localhost:4000`. 

Open `localhost:4000` in Google Chrome or Mozilla Firefox. You should see the codemirror editor.
