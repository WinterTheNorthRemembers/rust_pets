import * as vscode from 'vscode';
import { WebviewProvider } from './webview-provider';
import { AnalyzerClient } from './analyzer-client';

export function activate(context: vscode.ExtensionContext) {
    const analyzerClient = new AnalyzerClient(context);
    const webviewProvider = new WebviewProvider(context, analyzerClient);

    context.subscriptions.push(
        vscode.commands.registerCommand('rustpets.showTheatre', () => {
            webviewProvider.show();
        }),
        vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.languageId === 'rust') {
                webviewProvider.onDocumentChange(e.document);
            }
        }),
        vscode.workspace.onDidSaveTextDocument(doc => {
            if (doc.languageId === 'rust') {
                webviewProvider.onDocumentSave(doc);
            }
        }),
        analyzerClient,
        webviewProvider
    );
}

export function deactivate() {}
