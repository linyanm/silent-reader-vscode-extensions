const vscode = require('vscode');
const { getConfig, getReaderOptions } = require('./config');
const { buildPage, findPreviousPageOffset } = require('./pageBuilder');
const {
	buildChapterIndex,
	findChapterIndexByByteOffset,
	readChapterWindow,
} = require('./chapterLoader');

function resetBookState(reader, bookPath = '') {
	reader.bookPath = bookPath;
	reader.bookContent = '';
	reader.charToByteOffsets = [0];
	reader.chapterIndex = undefined;
	reader.loadedWindow = undefined;
	reader.currentProgress = 0;
	reader.pageHistory = [];
}

async function ensureChapterIndex(reader) {
	if (!reader.chapterIndex) {
		await reader.loadBook();
	}

	return Boolean(reader.chapterIndex);
}

async function loadBook(reader) {
	const configuredPath = getConfig().get('novelPath', '');
	resetBookState(reader, configuredPath);

	if (!configuredPath) {
		reader.refresh();
		return;
	}

	reader.loading = buildChapterIndex(configuredPath)
		.then(async (chapterIndex) => {
			if (reader.bookPath !== configuredPath) {
				return;
			}

			reader.chapterIndex = chapterIndex;
			reader.currentProgress = getPersistedProgress(reader);
			await loadWindowForProgress(reader, reader.currentProgress);
		})
		.catch((error) => {
			resetBookState(reader, configuredPath);
			vscode.window.showWarningMessage(`Silent Reader 无法读取小说文件：${error.message}`);
		})
		.finally(() => {
			reader.loading = undefined;
			reader.refresh();
		});

	await reader.loading;
}

async function syncWindowForCurrentProgress(reader) {
	if (reader.loading || !reader.chapterIndex) {
		return;
	}

	if (isProgressInLoadedWindow(reader, reader.currentProgress)) {
		return;
	}

	reader.loading = loadWindowForProgress(reader, reader.currentProgress)
		.catch((error) => {
			vscode.window.showWarningMessage(`Silent Reader 无法读取章节内容：${error.message}`);
		})
		.finally(() => {
			reader.loading = undefined;
			reader.applyDecorations();
		});
}

function isProgressInLoadedWindow(reader, progress) {
	return Boolean(
		reader.loadedWindow
		&& progress >= reader.loadedWindow.baseByteOffset
		&& (
			progress < reader.loadedWindow.endByteOffset
			|| progress === reader.chapterIndex?.fileSize
		),
	);
}

async function loadWindowForProgress(reader, progress, options = {}) {
	if (!reader.chapterIndex || !reader.bookPath) {
		return;
	}

	const chapterIndex = findChapterIndexByByteOffset(reader.chapterIndex, progress);
	const startChapterIndex = Math.max(0, chapterIndex - (options.includePreviousChapter ? 1 : 0));
	const endChapterIndex = Math.min(
		reader.chapterIndex.chapters.length - 1,
		chapterIndex + (options.extraChapters ?? 1),
	);

	if (
		reader.loadedWindow
		&& reader.loadedWindow.startChapterIndex === startChapterIndex
		&& reader.loadedWindow.endChapterIndex === endChapterIndex
	) {
		return;
	}

	const windowData = await readChapterWindow(
		reader.bookPath,
		reader.chapterIndex,
		startChapterIndex,
		endChapterIndex - startChapterIndex,
	);
	reader.bookContent = windowData.text;
	reader.charToByteOffsets = windowData.charToByteOffsets;
	reader.loadedWindow = {
		baseByteOffset: windowData.baseByteOffset,
		endByteOffset: reader.chapterIndex.chapters[windowData.endChapterIndex].endByte,
		startChapterIndex: windowData.startChapterIndex,
		endChapterIndex: windowData.endChapterIndex,
	};
}

function getLocalOffset(reader, absoluteByteOffset) {
	if (!reader.loadedWindow) {
		return 0;
	}

	const safeByteOffset = Math.max(
		reader.loadedWindow.baseByteOffset,
		Math.min(absoluteByteOffset, reader.loadedWindow.endByteOffset),
	);
	const localByteOffset = safeByteOffset - reader.loadedWindow.baseByteOffset;
	return findLocalOffsetByByteOffset(reader, localByteOffset);
}

function getAbsoluteOffset(reader, localOffset) {
	if (!reader.loadedWindow) {
		return 0;
	}

	const safeLocalOffset = Math.max(0, Math.min(localOffset, reader.bookContent.length));
	const byteLength = reader.charToByteOffsets[safeLocalOffset]
		?? reader.charToByteOffsets[reader.charToByteOffsets.length - 1]
		?? 0;
	return reader.loadedWindow.baseByteOffset + byteLength;
}

function findLocalOffsetByByteOffset(reader, localByteOffset) {
	let low = 0;
	let high = reader.charToByteOffsets.length - 1;
	let result = 0;

	while (low <= high) {
		const middle = Math.floor((low + high) / 2);
		if (reader.charToByteOffsets[middle] <= localByteOffset) {
			result = middle;
			low = middle + 1;
		} else {
			high = middle - 1;
		}
	}

	return result;
}

function normalizeChapterNumber(reader, chapterNumber) {
	return Math.max(1, Math.min(chapterNumber, reader.chapterIndex?.chapters.length ?? chapterNumber));
}

function getNextPageProgress(reader, currentPage) {
	if (currentPage.nextOffset > currentPage.startOffset) {
		const lastHistoryOffset = reader.pageHistory[reader.pageHistory.length - 1];
		const currentStartProgress = getAbsoluteOffset(reader, currentPage.startOffset);
		if (lastHistoryOffset !== currentStartProgress) {
			reader.pageHistory.push(currentStartProgress);
		}
	}

	return getAbsoluteOffset(reader, currentPage.nextOffset);
}

async function getPreviousPageProgress(reader, currentProgress, maxCharsPerLine, lineCount) {
	while (reader.pageHistory.length > 0) {
		const previousOffset = reader.pageHistory.pop();
		if (previousOffset < currentProgress) {
			return previousOffset;
		}
	}

	return findPreviousPageProgressByReload(reader, currentProgress, maxCharsPerLine, lineCount);
}

async function findPreviousPageProgressByReload(reader, currentProgress, maxCharsPerLine, lineCount) {
	const currentChapterIndex = findChapterIndexByByteOffset(reader.chapterIndex, currentProgress);
	await loadWindowForProgress(reader, currentProgress, {
		includePreviousChapter: currentChapterIndex > 0,
		extraChapters: 0,
	});

	const localProgress = getLocalOffset(reader, currentProgress);
	const previousLocalOffset = findPreviousPageOffset(
		reader.bookContent,
		localProgress,
		maxCharsPerLine,
		lineCount,
	);

	return getAbsoluteOffset(reader, previousLocalOffset);
}

async function setProgress(reader, progress) {
	const upperBound = reader.chapterIndex?.fileSize ?? progress;
	const safeProgress = Math.max(0, Math.min(progress, upperBound));
	reader.currentProgress = safeProgress;
	await reader.context.globalState.update(getProgressStorageKey(reader.bookPath), safeProgress);
}

async function setProgressForBookPath(reader, bookPath, progress) {
	const safeProgress = Math.max(0, progress);
	reader.currentProgress = safeProgress;
	await reader.context.globalState.update(getProgressStorageKey(bookPath), safeProgress);
}

async function reanchorProgressForLayoutChange(reader) {
	if (!reader.chapterIndex || !reader.bookPath) {
		return;
	}

	const nextProgress = await getReanchoredProgress(reader, reader.currentProgress);
	if (nextProgress === reader.currentProgress) {
		return;
	}

	await setProgress(reader, nextProgress);
	await loadWindowForProgress(reader, nextProgress);
}

async function getReanchoredProgress(reader, anchorProgress) {
	if (!reader.chapterIndex) {
		return anchorProgress;
	}

	const safeProgress = Math.max(0, Math.min(anchorProgress, reader.chapterIndex.fileSize));
	const chapterIndex = findChapterIndexByByteOffset(reader.chapterIndex, safeProgress);
	const chapterStartProgress = reader.chapterIndex.chapters[chapterIndex].startByte;
	if (safeProgress <= chapterStartProgress) {
		return chapterStartProgress;
	}

	const {
		insertLineCount,
		maxCharsPerLine,
	} = getReaderOptions();
	await loadWindowForProgress(reader, chapterStartProgress);
	const chapterStartLocalOffset = getLocalOffset(reader, chapterStartProgress);
	const chapterFirstPage = buildPage(
		reader.bookContent,
		chapterStartLocalOffset,
		maxCharsPerLine,
		insertLineCount,
	);
	const anchorLocalOffset = getLocalOffset(reader, safeProgress);
	if (anchorLocalOffset < chapterFirstPage.nextOffset) {
		return chapterStartProgress;
	}

	return safeProgress;
}

function getProgressStorageKey(bookPath) {
	return `readingProgress:${bookPath}`;
}

function getPersistedProgress(reader) {
	if (!reader.bookPath) {
		return 0;
	}

	const storedProgress = reader.context.globalState.get(getProgressStorageKey(reader.bookPath), 0);
	const safeProgress = Number.isInteger(storedProgress) && storedProgress >= 0 ? storedProgress : 0;
	return Math.min(safeProgress, reader.chapterIndex?.fileSize ?? safeProgress);
}

module.exports = {
	ensureChapterIndex,
	getAbsoluteOffset,
	getLocalOffset,
	getNextPageProgress,
	getPersistedProgress,
	getPreviousPageProgress,
	isProgressInLoadedWindow,
	loadBook,
	loadWindowForProgress,
	normalizeChapterNumber,
	reanchorProgressForLayoutChange,
	setProgress,
	setProgressForBookPath,
	syncWindowForCurrentProgress,
};
