import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';
import * as readline from 'readline';

export interface OwnershipEvent {
    kind: 'born' | 'moved' | 'imm_borrow' | 'mut_borrow' | 'borrow_end' | 'cloned' | 'dropped' | 'lifetime_error';
    variable: string;
    target?: string;
    line: number;
    col: number;
    scope_depth: number;
    type_name: string;
    is_mut: boolean;
}

interface AnalysisResponse {
    id: string;
    events: OwnershipEvent[];
    error?: string;
}

export class AnalyzerClient implements vscode.Disposable {
    private _child: child_process.ChildProcess | undefined;
    private _rl: readline.Interface | undefined;
    private _callbacks = new Map<string, (response: AnalysisResponse) => void>();
    private _requestId = 0;

    constructor(private readonly context: vscode.ExtensionContext) {
        this._start();
    }

    private _start() {
        const isWindows = process.platform === 'win32';
        const binaryName = isWindows ? 'rustpets-analyzer.exe' : 'rustpets-analyzer';
        const binaryPath = path.join(this.context.extensionPath, 'bin', binaryName);

        try {
            this._child = child_process.spawn(binaryPath, [], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            if (this._child.stdout) {
                this._rl = readline.createInterface({
                    input: this._child.stdout,
                    terminal: false
                });

                this._rl.on('line', (line) => {
                    try {
                        const response: AnalysisResponse = JSON.parse(line);
                        const callback = this._callbacks.get(response.id);
                        if (callback) {
                            callback(response);
                            this._callbacks.delete(response.id);
                        }
                    } catch (e) {
                        console.error('Failed to parse analyzer response:', e);
                    }
                });
            }

            this._child.on('error', (err) => {
                console.error('Analyzer process error:', err);
            });

            this._child.on('exit', (code) => {
                if (code !== 0) {
                    console.error(`Analyzer exited with code ${code}`);
                }
            });

        } catch (e) {
            console.error('Failed to spawn analyzer:', e);
        }
    }

    public async analyze(filePath: string, content: string): Promise<OwnershipEvent[]> {
        if (!this._child || !this._child.stdin) {
            return [];
        }

        const id = `req-${this._requestId++}`;
        const request = {
            id,
            file_path: filePath,
            content
        };

        return new Promise((resolve) => {
            this._callbacks.set(id, (response) => {
                if (response.error) {
                    console.error(`Analyzer error: ${response.error}`);
                    resolve([]);
                } else {
                    resolve(response.events);
                }
            });

            this._child?.stdin?.write(JSON.stringify(request) + '\n');
        });
    }

    public dispose() {
        if (this._rl) {
            this._rl.close();
        }
        if (this._child) {
            this._child.kill();
        }
    }
}
