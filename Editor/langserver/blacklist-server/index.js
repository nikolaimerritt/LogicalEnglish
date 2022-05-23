#!/usr/bin/env node

const {
    DiagnosticSeverity,
    TextDocuments,
    createConnection,
  } = require('vscode-languageserver')
  
  const {TextDocument} = require('vscode-languageserver-textdocument')


// returns list of {value: __, index: __} objects
const getBlacklisted = (text) => {
    const blacklist = [
        "foo",
        "bar",
        "baz"
    ]

    const regex = new RegExp(`\\b(${blacklist.join("|")})\\b`, "gi")
    
    const results = []
    const maxResults = 100
    while ((matches = regex.exec(text)) && results.length < maxResults) {
        results.push({
            value: matches[0],
            index: matches.index
        })
    }

    return results
}

const getDiagnostics = (textDocument) => 
    getBlacklisted(textDocument.getText())
    .map(blacklistToDiagnostic(textDocument))


const blacklistToDiagnostic = (textDocument) => 
    ({ index, value }) => ({
        severity: DiagnosticSeverity.Warning,
        range: {
            start: textDocument.positionAt(index),
            end: textDocument.positionAt(index + value.length)
        },
        message: `${value} is blacklisted -- bad! >:(`,
        source: 'Blacklister',
    })


// setting up connection and documents listener
const connection = createConnection()
const documents = new TextDocuments(TextDocument)

connection.onInitialize(() => ({
    capabilities: {
        textDocumentSync: documents.syncKind,
    },
}))


// setting up diagnostic notification
documents.onDidChangeContent(change => {
    connection.sendDiagnostics({
        uri: change.document.uri,
        diagnostics: getDiagnostics(change.document)
    })
})

documents.listen(connection)
connection.listen()