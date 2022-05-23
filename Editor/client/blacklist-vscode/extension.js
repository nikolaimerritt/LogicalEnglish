const { LanguageClient } = require('vscode-languageclient')

module.exports = {
  activate(context) {
    const executable = {
      command: 'blacklist-server',
      args: ['--stdio'],
    }

    const serverOptions = {
      run: executable,
      debug: executable,
    }

    const clientOptions = {
      documentSelector: [{
        scheme: 'file',
        language: 'plaintext',
      }],
    }

    const client = new LanguageClient(
      'blacklist-extension-id',
      'Blacklister',
      serverOptions,
      clientOptions
    )

    context.subscriptions.push(client.start())
  },
}
