import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ScratchProvider, ScratchItem } from './scratchProvider';

export function activate(context: vscode.ExtensionContext) {
    const scratchDir = path.join(context.globalStorageUri.fsPath, 'scratches');
    const scratchProvider = new ScratchProvider(scratchDir);

    vscode.window.registerTreeDataProvider('scratch-scratches', scratchProvider);

    let createNew = vscode.commands.registerCommand('scratch.createNew', async () => {
        const languages = await vscode.languages.getLanguages();
        const selectedLanguage = await vscode.window.showQuickPick(
            ['plaintext', ...languages.filter(l => l !== 'plaintext')],
            { placeHolder: 'Select a language for the scratch file' }
        );

        if (!selectedLanguage) {
            return;
        }

        const extension = getExtensionForLanguage(selectedLanguage);
        const fileName = await vscode.window.showInputBox({
            prompt: 'Enter scratch file name',
            value: `scratch_${Date.now()}${extension}`,
            valueSelection: [0, `scratch_${Date.now()}`.length]
        });

        if (!fileName) {
            return;
        }

        const filePath = path.join(scratchDir, fileName);
        if (fs.existsSync(filePath)) {
            vscode.window.showErrorMessage('File already exists.');
            return;
        }

        await fs.promises.writeFile(filePath, '');
        const uri = vscode.Uri.file(filePath);
        await vscode.commands.executeCommand('vscode.open', uri);
        scratchProvider.refresh();
    });

    let openFile = vscode.commands.registerCommand('scratch.openFile', async (uri: vscode.Uri) => {
        await vscode.commands.executeCommand('vscode.open', uri);
    });

    let deleteFile = vscode.commands.registerCommand('scratch.deleteFile', async (node: ScratchItem) => {
        const confirm = await vscode.window.showWarningMessage(
            `Are you sure you want to delete "${node.label}"?`,
            { modal: true },
            'Delete'
        );

        if (confirm === 'Delete') {
            await fs.promises.unlink(node.uri.fsPath);
            scratchProvider.refresh();
        }
    });

    let renameFile = vscode.commands.registerCommand('scratch.renameFile', async (node: ScratchItem) => {
        const newName = await vscode.window.showInputBox({
            prompt: 'Enter new name',
            value: node.label
        });

        if (newName && newName !== node.label) {
            const newPath = path.join(scratchDir, newName);
            await fs.promises.rename(node.uri.fsPath, newPath);
            scratchProvider.refresh();
        }
    });

    let refresh = vscode.commands.registerCommand('scratch.refresh', () => {
        scratchProvider.refresh();
    });

    context.subscriptions.push(createNew, openFile, deleteFile, renameFile, refresh);

    // Watch for file changes in the scratch directory
    const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(scratchDir, '*'));
    watcher.onDidCreate(() => scratchProvider.refresh());
    watcher.onDidDelete(() => scratchProvider.refresh());
    watcher.onDidChange(() => scratchProvider.refresh());
    context.subscriptions.push(watcher);
}

function getExtensionForLanguage(languageId: string): string {
    const languageMap: { [key: string]: string } = {
        'typescript': '.ts',
        'javascript': '.js',
        'python': '.py',
        'markdown': '.md',
        'json': '.json',
        'html': '.html',
        'css': '.css',
        'java': '.java',
        'c': '.c',
        'cpp': '.cpp',
        'go': '.go',
        'rust': '.rs',
        'php': '.php',
        'ruby': '.rb',
        'shellscript': '.sh',
        'yaml': '.yaml',
        'xml': '.xml',
        'plaintext': '.txt'
    };
    return languageMap[languageId] || '';
}

export function deactivate() {}
