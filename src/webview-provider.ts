import * as vscode from 'vscode';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export class WebviewProvider implements vscode.Disposable {
    private _panel: vscode.WebviewPanel | undefined;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    constructor(private readonly context: vscode.ExtensionContext) {
        this._extensionUri = context.extensionUri;
    }

    public show() {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (this._panel) {
            this._panel.reveal(column);
            return;
        }

        this._panel = vscode.window.createWebviewPanel(
            'rustpets.theatre',
            'RustPets Theatre',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(this._extensionUri, 'webview')
                ]
            }
        );

        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

        this._panel.onDidDispose(
            () => {
                this.dispose();
            },
            null,
            this._disposables
        );

        // Send demo message after 500ms
        setTimeout(() => {
            if (this._panel) {
                this._panel.webview.postMessage({
                    type: 'demo',
                    pets: [
                        { id: 'pet1', name: 'name', type: 'String', x: 150, y: 200, status: 'alive', animPhase: 0 },
                        { id: 'pet2', name: 'count', type: 'i32', x: 350, y: 200, status: 'alive', animPhase: 0 },
                        { id: 'pet3', name: 'items', type: 'Vec', x: 550, y: 200, status: 'alive', animPhase: 0 }
                    ]
                });
            }
        }, 500);
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const scriptCreaturesUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webview', 'creatures.js'));
        const scriptTheatreUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webview', 'theatre.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webview', 'style.css'));

        const nonce = crypto.randomBytes(16).toString('base64');

        const htmlPath = path.join(this.context.extensionPath, 'webview', 'index.html');
        let html = fs.readFileSync(htmlPath, 'utf8');

        // Inject nonce and URIs
        html = html.replace(/\$\{nonce\}/g, nonce);
        html = html.replace(/\$\{scriptCreaturesUri\}/g, scriptCreaturesUri.toString());
        html = html.replace(/\$\{scriptTheatreUri\}/g, scriptTheatreUri.toString());
        html = html.replace(/\$\{styleUri\}/g, styleUri.toString());
        html = html.replace(/\$\{cspSource\}/g, webview.cspSource);

        return html;
    }

    public dispose() {
        this._panel = undefined;
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
}
