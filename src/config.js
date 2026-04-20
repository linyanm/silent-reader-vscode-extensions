const vscode = require('vscode');

const EXTENSION_ID = 'silentReader';
const CONFIG_KEYS = {
	NOVEL_PATH: 'silentReader.novelPath',
	INSERTED_LINES: 'silentReader.insertedLines',
	MAX_CHARS_PER_LINE: 'silentReader.maxCharsPerLine',
	SHOW_CONTROL_LINE: 'silentReader.showControlLine',
	SHOW_TOP_CONTROL_LINE: 'silentReader.showTopControlLine',
	SHOW_PROGRESS_LINE: 'silentReader.showProgressLine',
};
const COMMAND_IDS = {
	SELECT_NOVEL: 'silent-reader-vscode-extensions.selectNovel',
	TOGGLE_READING: 'silent-reader-vscode-extensions.toggleReading',
	CLOSE_READING: 'silent-reader-vscode-extensions.closeReading',
	JUMP_TO_CHAPTER: 'silent-reader-vscode-extensions.jumpToChapter',
	JUMP_TO_CHAPTER_PERCENT: 'silent-reader-vscode-extensions.jumpToChapterPercent',
	NEXT_PAGE: 'silent-reader-vscode-extensions.nextPage',
	PREVIOUS_PAGE: 'silent-reader-vscode-extensions.previousPage',
	OPEN_SETTINGS: 'silent-reader-vscode-extensions.openSettings',
};
const DEFAULT_MAX_CHARS_PER_LINE = 80;
const DEFAULT_INSERTED_LINES = 3;
const DEFAULT_SHOW_CONTROL_LINE = true;
const DEFAULT_SHOW_TOP_CONTROL_LINE = true;
const DEFAULT_SHOW_PROGRESS_LINE = true;

function getConfig() {
	return vscode.workspace.getConfiguration(EXTENSION_ID);
}

function normalizePositiveInteger(value, fallback) {
	const numberValue = Number(value);
	if (!Number.isInteger(numberValue) || numberValue <= 0) {
		return fallback;
	}

	return numberValue;
}

function normalizeBoolean(value, fallback) {
	if (typeof value === 'boolean') {
		return value;
	}

	return fallback;
}

function getReaderOptions() {
	const config = getConfig();

	return {
		insertLineCount: normalizePositiveInteger(config.get('insertedLines'), DEFAULT_INSERTED_LINES),
		maxCharsPerLine: normalizePositiveInteger(config.get('maxCharsPerLine'), DEFAULT_MAX_CHARS_PER_LINE),
		showControlLine: normalizeBoolean(config.get('showControlLine'), DEFAULT_SHOW_CONTROL_LINE),
		showTopControlLine: normalizeBoolean(config.get('showTopControlLine'), DEFAULT_SHOW_TOP_CONTROL_LINE),
		showProgressLine: normalizeBoolean(config.get('showProgressLine'), DEFAULT_SHOW_PROGRESS_LINE),
	};
}

module.exports = {
	COMMAND_IDS,
	CONFIG_KEYS,
	EXTENSION_ID,
	DEFAULT_MAX_CHARS_PER_LINE,
	DEFAULT_INSERTED_LINES,
	DEFAULT_SHOW_CONTROL_LINE,
	DEFAULT_SHOW_TOP_CONTROL_LINE,
	DEFAULT_SHOW_PROGRESS_LINE,
	getConfig,
	getReaderOptions,
	normalizeBoolean,
	normalizePositiveInteger,
};
