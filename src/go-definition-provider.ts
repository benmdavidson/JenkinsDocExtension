import * as vscode from 'vscode';

export class GoDefinitionProvider implements vscode.DefinitionProvider {
  public async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): Promise<vscode.Definition | vscode.DefinitionLink[] | undefined> {
    const wordRange = document.getWordRangeAtPosition(position, /(?:\w+\.)?\w+/g);
    const clickedWords = document.getText(wordRange).split('.');

    if (clickedWords.length >= 2) {
      const [fileName, functionName] = clickedWords;
      console.log(`Clicked: ${fileName}.groovy => ${functionName}`);
      // Find files that have the same name of the clicked word
      const pattern = `**/*.groovy`;
      const location: Thenable<vscode.Location | undefined> = vscode.workspace
        .findFiles(pattern)
        .then(async uris => {
          for (const uri of uris) {
            const functionPosition = await vscode.workspace.openTextDocument(uri).then(doc => {
              return findFunctionInDoc(doc, functionName);
            });
            if (functionPosition) {
              return new Promise((resolve, reject) => {
                resolve(new vscode.Location(uri, functionPosition));
              });
            }
          }
        });
      return location;
    } else {
      const fileOrfunction = clickedWords[0];
      console.log(`Clicked: ${fileOrfunction}`);
      // Check in the current file if a function is declared with this name
      const functionPosition = findFunctionInDoc(document, fileOrfunction);
      if (functionPosition) {
        return new Promise((resolve, reject) => {
          resolve(new vscode.Location(document.uri, functionPosition));
        });
      }

      // Check if a file has the same name of the clicked word
      const pattern = `**/${fileOrfunction}.groovy`;
      return vscode.workspace.findFiles(pattern).then(uris => {
        return new Promise((resolve, reject) => {
          resolve(new vscode.Location(uris[0], new vscode.Position(0, 0)));
        });
      });
    }
  }
}

// Check in a file if a function with the given name is declared
function findFunctionInDoc(
  document: vscode.TextDocument,
  functionName: string,
): vscode.Position | undefined {
  for (let i = 0; i < document.lineCount; i++) {
    const functionDeclarationRegex = new RegExp(`\\w+(?: \\w+)? (${functionName}) *\\(.*`);
    if (document.lineAt(i).text.match(functionDeclarationRegex)) {
      return new vscode.Position(i, 0);
    }
  }
  return undefined;
}
