const vscode = require('vscode');
const {
	CONFIG_KEYS,
	getConfig,
	getReaderOptions,
} = require('./config');
const {
	applyDecorations,
	createDecorationType,
	getDisplayLines,
	provideCodeLenses,
} = require('./silentReaderDisplay');
const {
	ensureChapterIndex,
	getAbsoluteOffset,
	getLocalOffset,
	getNextPageProgress,
	getPreviousPageProgress,
	isProgressInLoadedWindow,
	loadBook,
	loadWindowForProgress,
	normalizeChapterNumber,
	reanchorProgressForLayoutChange,
	setProgress,
	setProgressForBookPath,
	syncWindowForCurrentProgress,
} = require('./silentReaderBook');
const { buildPage } = require('./pageBuilder');
const { findChapterIndexByByteOffset } = require('./chapterLoader');

class SilentReader {
	/**
	 * @param {vscode.ExtensionContext} context
	 */
	constructor(context) {
		this.context = context;
		this.decorationType = createDecorationType();
		this.codeLensEmitter = new vscode.EventEmitter();
		this.onDidChangeCodeLenses = this.codeLensEmitter.event;
		this.currentLine = 0;
		this.bookContent = '';
		this.charToByteOffsets = [0];
		this.bookPath = '';
		this.chapterIndex = undefined;
		this.loadedWindow = undefined;
		this.currentProgress = 0;
		this.pageHistory = [];
		this.readingEnabled = false;
		this.loading = undefined;
		this.decoratedEditor = undefined;
	}

	async initialize() {
		this.currentLine = vscode.window.activeTextEditor?.selection?.active?.line ?? 0;
		await this.loadBook();
	}

	refresh() {
		void syncWindowForCurrentProgress(this);
		this.applyDecorations();
		this.codeLensEmitter.fire();
	}

	async handleConfigurationChange(event) {
		if (event.affectsConfiguration(CONFIG_KEYS.NOVEL_PATH)) {
			await this.loadBook();
			return;
		}

		if (
			event.affectsConfiguration(CONFIG_KEYS.INSERTED_LINES)
			|| event.affectsConfiguration(CONFIG_KEYS.MAX_CHARS_PER_LINE)
			|| event.affectsConfiguration(CONFIG_KEYS.SHOW_TOP_CONTROL_LINE)
		) {
			await reanchorProgressForLayoutChange(this);
			this.refresh();
			return;
		}

		this.refresh();
	}

	updateCursorLine(editor = vscode.window.activeTextEditor) {
		const nextLine = editor?.selection?.active?.line ?? 0;
		if (nextLine !== this.currentLine) {
			this.currentLine = nextLine;
			this.refresh();
		}
	}

	async loadBook() {
		await loadBook(this);
	}

	applyDecorations(editor = vscode.window.activeTextEditor) {
		applyDecorations(this, editor);
	}

	provideCodeLenses(document) {
		return provideCodeLenses(this, document);
	}

	getDisplayLines(document) {
		return getDisplayLines(this, document);
	}

	async selectNovel() {
		const files = await vscode.window.showOpenDialog({
			canSelectFiles: true,
			canSelectFolders: false,
			canSelectMany: false,
			filters: {
				'Text novels': ['txt'],
				'All files': ['*'],
			},
			title: '选择 txt 小说文件',
		});

		if (!files?.[0]) {
			return;
		}

		const nextBookPath = files[0].fsPath;
		await getConfig().update('novelPath', nextBookPath, vscode.ConfigurationTarget.Global);
		await setProgressForBookPath(this, nextBookPath, 0);
		await this.loadBook();
	}

	async toggleReading() {
		const nextEnabled = !this.readingEnabled;
		this.readingEnabled = nextEnabled;
		this.currentLine = vscode.window.activeTextEditor?.selection?.active?.line ?? 0;
		this.refresh();
		vscode.window.showInformationMessage(`Silent Reader: 阅读显示已${nextEnabled ? '开启' : '关闭'}。`);
	}

	closeReading() {
		if (!this.readingEnabled) {
			return;
		}

		this.readingEnabled = false;
		this.refresh();
		vscode.window.showInformationMessage('Silent Reader: 阅读显示已关闭。');
	}

	async nextPage() {
		await this.movePage(1);
	}

	async previousPage() {
		await this.movePage(-1);
	}

	async selectChapter() {
		if (!await ensureChapterIndex(this)) {
			vscode.window.showInformationMessage('Silent Reader: 请先选择 txt 小说文件。');
			return;
		}

		const items = this.chapterIndex.chapters.map((chapter, index) => ({
			label: `${index + 1}. ${chapter.title}`,
			description: `偏移 ${chapter.startByte}`,
			chapterNumber: index + 1,
		}));
		const selectedItem = await vscode.window.showQuickPick(items, {
			matchOnDescription: true,
			placeHolder: '选择要跳转的章节',
			title: 'Silent Reader: Jump To Chapter',
		});

		if (!selectedItem) {
			return;
		}

		await this.jumpToChapterNumber(selectedItem.chapterNumber);
	}

	async jumpToChapterPercent() {
		if (!await ensureChapterIndex(this)) {
			vscode.window.showInformationMessage('Silent Reader: 请先选择 txt 小说文件。');
			return;
		}

		const currentChapterIndex = findChapterIndexByByteOffset(this.chapterIndex, this.currentProgress);
		const currentChapter = this.chapterIndex.chapters[currentChapterIndex];
		const chapterSpan = Math.max(0, currentChapter.endByte - currentChapter.startByte);
		const currentPercent = chapterSpan === 0
			? 0
			: ((this.currentProgress - currentChapter.startByte) / chapterSpan) * 100;
		const input = await vscode.window.showInputBox({
			prompt: `输入当前章节跳转百分比（0-100），当前章节：${currentChapter.title}`,
			placeHolder: '例如 35',
			title: 'Silent Reader: Jump To Chapter Percent',
			value: currentPercent.toFixed(1).replace(/\.0$/, ''),
			validateInput: (value) => {
				const trimmedValue = value.trim();
				if (!trimmedValue) {
					return '请输入 0 到 100 之间的数字。';
				}

				const percent = Number(trimmedValue);
				if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
					return '请输入 0 到 100 之间的数字。';
				}

				return undefined;
			},
		});

		if (input === undefined) {
			return;
		}

		const percent = Math.max(0, Math.min(100, Number(input.trim())));
		const rawTargetProgress = currentChapter.startByte + Math.floor((chapterSpan * percent) / 100);
		const targetProgress = percent >= 100 && chapterSpan > 0
			? Math.max(currentChapter.startByte, currentChapter.endByte - 1)
			: rawTargetProgress;
		this.pageHistory = [];
		await setProgress(this, targetProgress);
		await loadWindowForProgress(this, targetProgress);
		this.refresh();
	}

	async movePage(direction) {
		if (!await ensureChapterIndex(this)) {
			vscode.window.showInformationMessage('Silent Reader: 请先选择 txt 小说文件。');
			return;
		}

		const {
			insertLineCount,
			maxCharsPerLine,
		} = getReaderOptions();
		await loadWindowForProgress(this, this.currentProgress);
		const localProgress = getLocalOffset(this, this.currentProgress);
		const currentPage = buildPage(this.bookContent, localProgress, maxCharsPerLine, insertLineCount);
		const currentStartProgress = getAbsoluteOffset(this, currentPage.startOffset);
		const nextProgress = direction > 0
			? getNextPageProgress(this, currentPage)
			: await getPreviousPageProgress(this, currentStartProgress, maxCharsPerLine, insertLineCount);

		await setProgress(this, nextProgress);
		await loadWindowForProgress(this, nextProgress);
		this.refresh();
	}

	normalizeChapterNumber(chapterNumber) {
		return normalizeChapterNumber(this, chapterNumber);
	}

	async jumpToChapterNumber(chapterNumber) {
		if (!this.chapterIndex) {
			return;
		}

		const targetChapterNumber = this.normalizeChapterNumber(chapterNumber);
		const targetChapter = this.chapterIndex.chapters[targetChapterNumber - 1];
		this.pageHistory = [];
		await setProgress(this, targetChapter.startByte);
		await loadWindowForProgress(this, targetChapter.startByte);

		this.refresh();
	}

	isProgressInLoadedWindow(progress) {
		return isProgressInLoadedWindow(this, progress);
	}

	getLocalOffset(absoluteByteOffset) {
		return getLocalOffset(this, absoluteByteOffset);
	}

	getAbsoluteOffset(localOffset) {
		return getAbsoluteOffset(this, localOffset);
	}

	dispose() {
		this.codeLensEmitter.dispose();
		this.decorationType.dispose();
	}
}

module.exports = {
	SilentReader,
};
