import * as vscode from 'vscode';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { AnalyzerClient } from './analyzer-client';

export class WebviewProvider implements vscode.Disposable {
    private _panel: vscode.WebviewPanel | undefined;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _debounceTimer: NodeJS.Timeout | undefined;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly analyzerClient: AnalyzerClient
    ) {
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
                this._panel = undefined;
            },
            null,
            this._disposables
        );

        // Initial analysis if there is an active editor
        if (vscode.window.activeTextEditor) {
            this.onDocumentSave(vscode.window.activeTextEditor.document);
        }
    }

    public onDocumentChange(document: vscode.TextDocument) {
        if (this._debounceTimer) {
            clearTimeout(this._debounceTimer);
        }
        this._debounceTimer = setTimeout(() => {
            this._runAnalysis(document);
        }, 800);
    }

    public onDocumentSave(document: vscode.TextDocument) {
        if (this._debounceTimer) {
            clearTimeout(this._debounceTimer);
        }
        this._runAnalysis(document);
    }

    private async _runAnalysis(document: vscode.TextDocument) {
        if (!this._panel) {
            return;
        }

        const events = await this.analyzerClient.analyze(document.fileName, document.getText());
        
        this._panel.webview.postMessage({
            type: 'ownership_events',
            filename: path.basename(document.fileName),
            events: events
        });
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
        this._panel?.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
}
