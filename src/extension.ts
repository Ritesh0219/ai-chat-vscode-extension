import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  const panelCommand = vscode.commands.registerCommand('aiChat.start', () => {
    const panel = vscode.window.createWebviewPanel(
      'aiChat',
      'AI Chat Assistant',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(context.extensionPath, 'media', 'build'))
        ]
      }
    );

    const buildPath = path.join(context.extensionPath, 'media', 'build');
    const manifestPath = path.join(buildPath, 'asset-manifest.json');

    let manifest: any;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (error) {
      vscode.window.showErrorMessage('❌ Failed to load asset-manifest.json.');
      return;
    }

    const mainJs = manifest.files['main.js'];
    const mainCss = manifest.files['main.css'];

    const scriptUri = panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(buildPath, mainJs))
    );
    const styleUri = panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(buildPath, mainCss))
    );

    const indexHtmlPath = path.join(buildPath, 'index.html');
    let html = fs.readFileSync(indexHtmlPath, 'utf8');

    html = html.replace(/\/static\/js\/main\.[^"]+/, scriptUri.toString());
    html = html.replace(/\/static\/css\/main\.[^"]+/, styleUri.toString());

    panel.webview.html = html;

    // Handle messages from WebView
    panel.webview.onDidReceiveMessage(
      async (msg) => {
        if (msg.type === 'readFile' && msg.filename) {
          const workspaceFolders = vscode.workspace.workspaceFolders;
          if (!workspaceFolders) {
            panel.webview.postMessage({ type: 'fileNotFound' });
            return;
          }

          const rootPath = workspaceFolders[0].uri.fsPath;
          const targetPath = path.join(rootPath, msg.filename);

          try {
            const content = fs.readFileSync(targetPath, 'utf8');
            panel.webview.postMessage({ type: 'fileContent', content });
          } catch (err) {
            panel.webview.postMessage({ type: 'fileNotFound' });
          }
        }

        // Handle request to send list of all workspace files
        if (msg.type === 'requestFileList') {
          const workspaceFolders = vscode.workspace.workspaceFolders;
          if (workspaceFolders) {
            const rootPath = workspaceFolders[0].uri.fsPath;
            const files = getAllFilesRecursively(rootPath).map(file =>
              path.relative(rootPath, file).replace(/\\/g, '/')
            );
            panel.webview.postMessage({ type: 'fileList', files });
          }
        }
      },
      undefined,
      context.subscriptions
    );
  });

  context.subscriptions.push(panelCommand);
}

// Recursively gather all file paths in the workspace
function getAllFilesRecursively(dir: string): string[] {
  let results: string[] = [];

  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFilesRecursively(filePath));
    } else {
      results.push(filePath);
    }
  }

  return results;
}
