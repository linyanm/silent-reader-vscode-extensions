const path = require('path');
const vscode = require('vscode');
const {
	COMMAND_IDS,
	getReaderOptions,
} = require('./config');
const { buildPage } = require('./pageBuilder');
const { findChapterIndexByByteOffset } = require('./chapterLoader');

function createDecorationType() {
	return vscode.window.createTextEditorDecorationType({
		before: {
			color: new vscode.ThemeColor('editorCodeLens.foreground'),
			fontStyle: 'normal',
			fontWeight: 'normal',
			margin: '0 2em 0 0',
			textDecoration: 'none;',
		},
		rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
	});
}

function applyDecorations(reader, editor = vscode.window.activeTextEditor) {
	if (reader.decoratedEditor && reader.decoratedEditor !== editor) {
		reader.decoratedEditor.setDecorations(reader.decorationType, []);
	}

	if (!editor) {
		reader.decoratedEditor = undefined;
		return;
	}

	reader.decoratedEditor = editor;

	const displayLines = getDisplayLines(reader, editor.document);
	if (displayLines.length === 0) {
		editor.setDecorations(reader.decorationType, []);
		return;
	}

	const targetLine = getDisplayAnchorLine(reader, editor.document, displayLines.length);
	const decorations = displayLines
		.map((line, index) => {
			const documentLine = editor.document.lineAt(targetLine + index);

			return {
				range: new vscode.Range(documentLine.range.start, documentLine.range.start),
				renderOptions: {
					before: {
						contentText: line,
					},
				},
			};
		});

	editor.setDecorations(reader.decorationType, decorations);
}

function provideCodeLenses(reader, document) {
	const editor = vscode.window.activeTextEditor;
	if (
		!editor
		|| editor.document.uri.toString() !== document.uri.toString()
		|| !reader.readingEnabled
	) {
		return [];
	}

	const {
		showControlLine,
		showTopControlLine,
	} = getReaderOptions();
	if (!showControlLine && !showTopControlLine) {
		return [];
	}

	const displayLines = getDisplayLines(reader, document);
	if (displayLines.length === 0) {
		return [];
	}

	const maxLine = Math.max(document.lineCount - 1, 0);
	const displayStartLine = getDisplayAnchorLine(reader, document, displayLines.length);
	const topLine = document.lineAt(displayStartLine);
	const bottomLineIndex = Math.min(displayStartLine + displayLines.length, maxLine);
	const bottomLine = document.lineAt(bottomLineIndex);
	const topRange = new vscode.Range(topLine.range.start, topLine.range.start);
	const bottomRange = new vscode.Range(bottomLine.range.start, bottomLine.range.start);

	const topCodeLenses = showTopControlLine
		? [
			new vscode.CodeLens(topRange, {
				title: 'close',
				command: COMMAND_IDS.CLOSE_READING,
			}),
			new vscode.CodeLens(topRange, {
				title: 'chapter',
				command: COMMAND_IDS.JUMP_TO_CHAPTER,
			}),
			new vscode.CodeLens(topRange, {
				title: 'progress',
				command: COMMAND_IDS.JUMP_TO_CHAPTER_PERCENT,
			}),
		]
		: [];
	const bottomCodeLenses = showControlLine
		? [
			new vscode.CodeLens(bottomRange, {
				title: 'prev',
				command: COMMAND_IDS.PREVIOUS_PAGE,
			}),
			new vscode.CodeLens(bottomRange, {
				title: 'next',
				command: COMMAND_IDS.NEXT_PAGE,
			}),
		]
		: [];

	return [...topCodeLenses, ...bottomCodeLenses];
}

function getDisplayLines(reader, document) {
	const editor = vscode.window.activeTextEditor;
	if (!editor || editor.document.uri.toString() !== document.uri.toString()) {
		return [];
	}

	const {
		insertLineCount,
		maxCharsPerLine,
		showProgressLine,
	} = getReaderOptions();

	if (!reader.readingEnabled) {
		return [];
	}

	if (reader.loading) {
		return ['Silent Reader: 正在读取小说...'];
	}

	if (!reader.bookPath) {
		return ['Silent Reader: 运行命令 Silent Reader: Select Novel 选择 txt 小说文件'];
	}

	if (!reader.chapterIndex) {
		return [`Silent Reader: 正在建立章节索引 (${path.basename(reader.bookPath)})`];
	}

	if (!reader.bookContent || !reader.loadedWindow || !reader.isProgressInLoadedWindow(reader.currentProgress)) {
		return [`Silent Reader: 未读取到内容 (${path.basename(reader.bookPath)})`];
	}

	const localProgress = reader.getLocalOffset(reader.currentProgress);
	const page = buildPage(reader.bookContent, localProgress, maxCharsPerLine, insertLineCount);
	if (!showProgressLine) {
		return page.lines;
	}

	const statusLine = getReadingStatusLine(reader);
	if (page.lines.length === 0) {
		return [statusLine];
	}

	return [statusLine, ...page.lines];
}

function getDisplayAnchorLine(reader, document, displayLineCount) {
	const maxLine = Math.max(document.lineCount - 1, 0);
	const maxStartLine = Math.max(document.lineCount - displayLineCount, 0);
	const preferredLine = Math.min(reader.currentLine, maxLine);

	return Math.min(preferredLine, maxStartLine);
}

function getReadingStatusLine(reader) {
	if (!reader.chapterIndex) {
		return 'chapter -, 0%';
	}

	const chapterIndex = findChapterIndexByByteOffset(reader.chapterIndex, reader.currentProgress);
	const chapter = reader.chapterIndex.chapters[chapterIndex];
	const chapterSpan = Math.max(0, chapter.endByte - chapter.startByte);
	const rawPercent = chapterSpan === 0
		? 0
		: ((reader.currentProgress - chapter.startByte) / chapterSpan) * 100;
	const percent = Math.max(0, Math.min(100, rawPercent));
	return `chapter ${chapterIndex + 1}, ${percent.toFixed(1)}%`;
}

module.exports = {
	applyDecorations,
	createDecorationType,
	getDisplayLines,
	getReadingStatusLine,
	getDisplayAnchorLine,
	provideCodeLenses,
};
