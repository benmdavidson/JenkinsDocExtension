import * as vscode from 'vscode';
import { completions } from './extension';
import jenkinsData from './jenkins-data.json';

export class CompletionProvider<T extends vscode.CompletionItem = vscode.CompletionItem>
  implements vscode.CompletionItemProvider {
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext,
  ) {
    const linePrefix = document.lineAt(position).text.substr(0, position.character);
    const commandMatch = linePrefix.match(/^.*?(\w+)\(/) || [];
    if (commandMatch.length > 1) {
      const command = commandMatch[1];
      const instruction = jenkinsData.instructions.find(
        instruction => instruction.command === command,
      );
      if (instruction) {
        const paramCompletions = instruction.parameters.map(parameter => {
          const completion = new vscode.CompletionItem(
            parameter.name,
            vscode.CompletionItemKind.Property,
          );
          completion.documentation = parseDocumentation(parameter);
          completion.detail = `${parameter.type} ${parameter.isOptional ? '(Optional)' : ''}`;
          if (parameter.type === 'String') {
            completion.insertText = new vscode.SnippetString(`${parameter.name}: '$0'`);
          } else if (parameter.type === 'boolean') {
            completion.insertText = new vscode.SnippetString(
              `${parameter.name}: \${1|true,false|}`,
            );
          } else if (parameter.type === 'Enum' && parameter.values.length) {
            const enumValues = parameter.values.join(',');
            completion.insertText = new vscode.SnippetString(
              `${parameter.name}: '\${1|${enumValues}|}'`,
            );
          } else {
            completion.insertText = `${parameter.name}: `;
          }
          return completion;
        });
        return paramCompletions;
      }
    }
    return completions;
  }
}

function parseDocumentation(parameter: {
  values: string[];
  description: string;
}): string | vscode.MarkdownString | undefined {
  let markdown = '';
  if (parameter.values.length) {
    markdown += parameter.values.map(value => `* ${value}\n`).join('');
    markdown += '\n';
  }
  if (parameter.description) {
    markdown += parameter.description;
  }
  return markdown ? new vscode.MarkdownString(markdown) : undefined;
}