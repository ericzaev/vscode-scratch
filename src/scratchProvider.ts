import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class ScratchProvider implements vscode.TreeDataProvider<ScratchItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ScratchItem | undefined | null | void> = new vscode.EventEmitter<ScratchItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ScratchItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private scratchDir: string) {
        if (!fs.existsSync(this.scratchDir)) {
            fs.mkdirSync(this.scratchDir, { recursive: true });
        }
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ScratchItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: ScratchItem): Promise<ScratchItem[]> {
        if (!this.scratchDir) {
            return [];
        }

        if (element) {
            return [];
        } else {
            const files = await fs.promises.readdir(this.scratchDir);
            return files
                .filter(file => !file.startsWith('.'))
                .sort((a, b) => {
                    const statsA = fs.statSync(path.join(this.scratchDir, a));
                    const statsB = fs.statSync(path.join(this.scratchDir, b));
                    return statsB.mtime.getTime() - statsA.mtime.getTime();
                })
                .map(file => new ScratchItem(
                    file,
                    vscode.Uri.file(path.join(this.scratchDir, file)),
                    vscode.TreeItemCollapsibleState.None
                ));
        }
    }
}

export class ScratchItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly uri: vscode.Uri,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.tooltip = this.uri.fsPath;
        this.description = '';
        this.resourceUri = this.uri;
        this.command = {
            command: 'scratch.openFile',
            title: 'Open Scratch File',
            arguments: [this.uri]
        };
        this.contextValue = 'scratchItem';
    }
}
