# How to run the Logical English Language Server
## Pre-requisites
You will need:
    - node () version 16.4.5 or newer
    - node package manager (`npm`) () version 8.12.2 or newer
    - visual studio code (`code`) () version 1.68.1 or newer

## Initial set up
From the `LogicalEnglish/vscode-package` directory, run `npm install`. This installs all the node packages for the syntax highlighter, language server, and visual studio code client.

From the `LogicalEnglish/codemirror-client` directory, run `npm install`. This installs all the node packages for the codemirror client and its frontend.


## Running the visual studio code client
From the `LogicalEnglish/vscode-package` directory, run `code .`. This launces Visual Studio Code in the `vscode-package` directory. This window, however, is for editing the project. To run the client, press `Run -> Start Debugging`, launching a new Visual Studio Code window connected to the language server. From here, you can make a new Logical English (`*.le`) file, or open an existing file. The language server and syntax highlighter will operate on these files.

## Running the codemirror client
From the `LogicalEnglish/vscode-package/server` directory, run `npm link`. (You may have to run `sudo npm link`.) This ??
From the `LogicalEnglish/codemirror-client/frontent` directory, run 