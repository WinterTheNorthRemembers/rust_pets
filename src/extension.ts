import * as vscode from 'vscode';
import { WebviewProvider } from './webview-provider';

export function activate(context: vscode.ExtensionContext) {
    const webviewProvider = new WebviewProvider(context);

    context.subscriptions.push(
        vscode.commands.registerCommand('rustpets.showTheatre', () => {
            webviewProvider.show();
        }),
        webviewProvider
    );
}

export function deactivate() {}
