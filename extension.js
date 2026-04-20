const vscode = require('vscode');
const { COMMAND_IDS, EXTENSION_ID } = require('./src/config');
const { SilentReader } = require('./src/silentReader');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const reader = new SilentReader(context);
  context.subscriptions.push(reader);
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { scheme: 'file' },
      {
        onDidChangeCodeLenses: reader.onDidChangeCodeLenses,
        provideCodeLenses(document) {
          return reader.provideCodeLenses(document);
        },
      },
    ),
  );

  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection((event) => {
      if (event.textEditor === vscode.window.activeTextEditor) {
        reader.updateCursorLine(event.textEditor);
      }
    }),
  );
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      reader.updateCursorLine(editor);
      reader.refresh();
    }),
  );
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (event.affectsConfiguration(EXTENSION_ID)) {
        await reader.handleConfigurationChange(event);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.SELECT_NOVEL, () =>
      reader.selectNovel(),
    ),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.TOGGLE_READING, () =>
      reader.toggleReading(),
    ),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.CLOSE_READING, () =>
      reader.closeReading(),
    ),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.JUMP_TO_CHAPTER, () =>
      reader.selectChapter(),
    ),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.JUMP_TO_CHAPTER_PERCENT, () =>
      reader.jumpToChapterPercent(),
    ),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.NEXT_PAGE, () =>
      reader.nextPage(),
    ),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.PREVIOUS_PAGE, () =>
      reader.previousPage(),
    ),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.OPEN_SETTINGS, () => {
      vscode.commands.executeCommand(
        'workbench.action.openSettings',
        'Silent Reader',
      );
    }),
  );

  void reader.initialize().catch((error) => {
    vscode.window.showWarningMessage(
      `Silent Reader 初始化失败：${error.message}`,
    );
  });
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
