const fs = require('fs');

const CHAPTER_TITLE_PATTERNS = [
	/^第[0-9零一二三四五六七八九十百千万两〇○壹贰叁肆伍陆柒捌玖拾佰仟]+[章节卷部篇回集](?:$|[^\S\n\r:：\-_.、]|[:：\-_.、][^\n\r]*)/u,
	/^(chapter|chap\.)[^\S\n\r]*\d+(?:$|[^\S\n\r:：\-_.]|[:：\-_.][^\n\r]*)/iu,
	/^(序章|楔子|尾声|后记|番外)(?:$|[^\S\n\r:：\-_.、]|[:：\-_.、][^\n\r]*)/u,
	/^(prologue|epilogue|preface|appendix)[^\S\n\r]*.*$/iu,
];

function isChapterTitle(line) {
	const normalizedLine = line.trim();
	if (!normalizedLine) {
		return false;
	}

	if (normalizedLine.length > 40 || /[。！？；，!?;,]/u.test(normalizedLine)) {
		return false;
	}

	return CHAPTER_TITLE_PATTERNS.some((pattern) => pattern.test(normalizedLine));
}

async function buildChapterIndex(filePath) {
	const handle = await fs.promises.open(filePath, 'r');
	const readBuffer = Buffer.alloc(64 * 1024);
	const chapters = [];
	let fileOffset = 0;
	let lineStartByte = 0;
	let lineChunks = [];

	try {
		while (true) {
			const { bytesRead } = await handle.read(readBuffer, 0, readBuffer.length, fileOffset);
			if (bytesRead === 0) {
				break;
			}

			let segmentStart = 0;
			for (let index = 0; index < bytesRead; index += 1) {
				if (readBuffer[index] !== 0x0A) {
					continue;
				}

				if (index > segmentStart) {
					lineChunks.push(Buffer.from(readBuffer.subarray(segmentStart, index)));
				}

				processLine(lineChunks, lineStartByte, chapters);
				lineChunks = [];
				lineStartByte = fileOffset + index + 1;
				segmentStart = index + 1;
			}

			if (segmentStart < bytesRead) {
				lineChunks.push(Buffer.from(readBuffer.subarray(segmentStart, bytesRead)));
			}

			fileOffset += bytesRead;
		}

		if (lineChunks.length > 0 || fileOffset === 0) {
			processLine(lineChunks, lineStartByte, chapters);
		}

		const { size } = await handle.stat();
		if (chapters.length === 0) {
			chapters.push({
				title: '开始',
				startByte: 0,
				endByte: size,
			});
		} else if (chapters[0].startByte > 0) {
			chapters.unshift({
				title: '开始',
				startByte: 0,
				endByte: chapters[0].startByte,
			});
		}

		for (let index = 0; index < chapters.length; index += 1) {
			chapters[index].endByte = chapters[index + 1]?.startByte ?? size;
		}

		return {
			chapters,
			fileSize: size,
		};
	} finally {
		await handle.close();
	}
}

function processLine(lineChunks, lineStartByte, chapters) {
	const lineBuffer = lineChunks.length === 1
		? lineChunks[0]
		: Buffer.concat(lineChunks);
	const normalizedBuffer = lineBuffer.length > 0 && lineBuffer[lineBuffer.length - 1] === 0x0D
		? lineBuffer.subarray(0, lineBuffer.length - 1)
		: lineBuffer;
	const lineText = normalizedBuffer.toString('utf8').trim();

	if (!isChapterTitle(lineText)) {
		return;
	}

	const previousChapter = chapters[chapters.length - 1];
	if (previousChapter?.startByte === lineStartByte) {
		previousChapter.title = lineText;
		return;
	}

	chapters.push({
		title: lineText,
		startByte: lineStartByte,
		endByte: lineStartByte,
	});
}

async function readChapterWindow(filePath, chapterIndexData, chapterIndex, extraChapters = 1) {
	const safeChapterIndex = Math.max(0, Math.min(chapterIndex, chapterIndexData.chapters.length - 1));
	const startChapterIndex = safeChapterIndex;
	const endChapterIndex = Math.min(
		chapterIndexData.chapters.length - 1,
		safeChapterIndex + Math.max(0, extraChapters),
	);
	const startByte = chapterIndexData.chapters[startChapterIndex].startByte;
	const endByte = chapterIndexData.chapters[endChapterIndex].endByte;
	const buffer = await readByteRange(filePath, startByte, endByte);
	const normalizedWindow = normalizeWindowBuffer(buffer);

	return {
		text: normalizedWindow.text,
		charToByteOffsets: normalizedWindow.charToByteOffsets,
		baseByteOffset: startByte,
		startChapterIndex,
		endChapterIndex,
	};
}

async function readByteRange(filePath, startByte, endByte) {
	const handle = await fs.promises.open(filePath, 'r');
	const rangeLength = Math.max(0, endByte - startByte);
	const buffer = Buffer.alloc(rangeLength);
	let totalRead = 0;

	try {
		while (totalRead < rangeLength) {
			const { bytesRead } = await handle.read(
				buffer,
				totalRead,
				rangeLength - totalRead,
				startByte + totalRead,
			);
			if (bytesRead === 0) {
				break;
			}

			totalRead += bytesRead;
		}

		return totalRead === rangeLength ? buffer : buffer.subarray(0, totalRead);
	} finally {
		await handle.close();
	}
}

function findChapterIndexByByteOffset(chapterIndexData, byteOffset) {
	const chapters = chapterIndexData.chapters;
	let low = 0;
	let high = chapters.length - 1;
	let result = 0;

	while (low <= high) {
		const middle = Math.floor((low + high) / 2);
		if (chapters[middle].startByte <= byteOffset) {
			result = middle;
			low = middle + 1;
		} else {
			high = middle - 1;
		}
	}

	return result;
}

function normalizeWindowBuffer(buffer) {
	const textParts = [];
	const charToByteOffsets = [0];
	let byteIndex = 0;

	while (byteIndex < buffer.length) {
		if (buffer[byteIndex] === 0x0D) {
			const nextByteIndex = buffer[byteIndex + 1] === 0x0A ? byteIndex + 2 : byteIndex + 1;
			textParts.push('\n');
			charToByteOffsets.push(nextByteIndex);
			byteIndex = nextByteIndex;
			continue;
		}

		const charByteLength = getUtf8CharByteLength(buffer[byteIndex]);
		const nextByteIndex = Math.min(byteIndex + charByteLength, buffer.length);
		const char = buffer.toString('utf8', byteIndex, nextByteIndex);
		textParts.push(char);

		for (let index = 0; index < char.length; index += 1) {
			charToByteOffsets.push(nextByteIndex);
		}

		byteIndex = nextByteIndex;
	}

	return {
		text: textParts.join(''),
		charToByteOffsets,
	};
}

function getUtf8CharByteLength(firstByte) {
	if ((firstByte & 0x80) === 0) {
		return 1;
	}

	if ((firstByte & 0xE0) === 0xC0) {
		return 2;
	}

	if ((firstByte & 0xF0) === 0xE0) {
		return 3;
	}

	if ((firstByte & 0xF8) === 0xF0) {
		return 4;
	}

	return 1;
}

module.exports = {
	buildChapterIndex,
	findChapterIndexByByteOffset,
	readChapterWindow,
};
