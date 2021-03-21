import * as vscode from 'vscode';
import { completions, envVarCompletions } from './extension';
import jenkinsData from './jenkins-data.json';

export class CompletionProvider<T extends vscode.CompletionItem = vscode.CompletionItem>
  implements vscode.CompletionItemProvider {
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext,
  ) {
    let previousLine = '';
    if (position.line) {
      const previousLinePosition = new vscode.Position(position.line - 1, position.character);
      previousLine = document.lineAt(previousLinePosition).text;
    }
    const linePrefix = document.lineAt(position).text.substr(0, position.character);
    const linesPrefix = previousLine + '\n' + linePrefix;

    // "env." autocompletion
    if (linePrefix.match(/(env)\.\w*$/)) {
      return envVarCompletions.map(completion => ({
        // removing the insertion of "env." in this case since it is already written
        ...completion,
        insertText: completion.label,
      }));
    }

    // Inside a post{}
    if (linesPrefix.match(/(post\s*{\s*\w*)$/)) {
      const postSection = jenkinsData.sections.find(section => section.name === 'post');
      if (postSection) {
        return postSection.innerInstructions.map(innerInstruction => {
          const completion = new vscode.CompletionItem(
            innerInstruction,
            vscode.CompletionItemKind.Method,
          );
          completion.insertText = new vscode.SnippetString(`${innerInstruction} {\n    $0\n}`);
          return completion;
        });
      }
    }

    // Parameters autocompletion
    // Check if the user has opened a parenthesis and retrieves the instruction before the parenthesis
    const instructionMatch = linePrefix.match(/{?\s*(\w+)\s*[( ](?!.*[{(])/) || [];
    if (instructionMatch.length > 1) {
      const command = instructionMatch[1];
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
