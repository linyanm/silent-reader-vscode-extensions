const BREAK_AFTER_CHARS = new Set([
	'。', '，', '、', '；', '：', '！', '？', '.', ',', ';', ':', '!', '?',
	')', '）', ']', '】', '}', '》', '」', '』', '"', '\'', '”', '’',
]);
const BREAK_BEFORE_CHARS = new Set([
	'(', '（', '[', '【', '{', '《', '「', '『', '"', '\'', '“', '‘',
]);

function buildPage(text, rawOffset, maxCharsPerLine, lineCount) {
	const startOffset = clampToReadableOffset(text, rawOffset);
	const lines = [];
	let offset = startOffset;

	while (lines.length < lineCount && offset < text.length) {
		const line = readVisualLine(text, offset, maxCharsPerLine);
		offset = line.nextOffset;

		if (line.text.length > 0) {
			lines.push(line.text);
		}
	}

	return {
		lines,
		startOffset,
		nextOffset: offset,
	};
}

function readVisualLine(text, offset, maxCharsPerLine) {
	const start = skipLeadingWhitespace(text, offset);

	if (start >= text.length) {
		return {
			text: '',
			nextOffset: start,
		};
	}

	const lineBoundary = findLineBoundary(text, start, maxCharsPerLine);

	if (lineBoundary.newlineOffset !== -1) {
		return {
			text: text.slice(start, lineBoundary.newlineOffset).trim(),
			nextOffset: lineBoundary.newlineOffset + 1,
		};
	}

	if (lineBoundary.limitOffset >= text.length) {
		return {
			text: text.slice(start, lineBoundary.limitOffset).trim(),
			nextOffset: lineBoundary.limitOffset,
		};
	}

	const breakOffset = findReadableBreakOffset(
		text,
		start,
		lineBoundary.preferredOffset,
		lineBoundary.limitOffset,
	);

	return {
		text: text.slice(start, breakOffset).trim(),
		nextOffset: skipInlineWhitespace(text, breakOffset),
	};
}

function findLineBoundary(text, start, maxVisualWidth) {
	const preferredVisualWidth = Math.max(1, Math.floor(maxVisualWidth * 0.6));
	let cursor = start;
	let visualWidth = 0;
	let preferredOffset = start;

	while (cursor < text.length) {
		if (visualWidth >= preferredVisualWidth && preferredOffset === start) {
			preferredOffset = cursor;
		}

		const char = text[cursor];
		if (char === '\n') {
			return {
				limitOffset: cursor,
				newlineOffset: cursor,
				preferredOffset,
			};
		}

		const nextCursor = advanceOffset(text, cursor);
		const nextWidth = visualWidth + getVisualWidth(text.slice(cursor, nextCursor));
		if (nextWidth > maxVisualWidth) {
			const safeLimitOffset = cursor === start ? nextCursor : cursor;
			return {
				limitOffset: safeLimitOffset,
				newlineOffset: -1,
				preferredOffset: preferredOffset === start ? safeLimitOffset : preferredOffset,
			};
		}

		cursor = nextCursor;
		visualWidth = nextWidth;
	}

	return {
		limitOffset: cursor,
		newlineOffset: -1,
		preferredOffset: preferredOffset === start ? cursor : preferredOffset,
	};
}

function findReadableBreakOffset(text, start, preferredStart, limit) {
	for (let index = limit - 1; index >= preferredStart; index -= 1) {
		const char = text[index];
		if (BREAK_AFTER_CHARS.has(char)) {
			return index + 1;
		}

		if (/\s/.test(char) && char !== '\n') {
			return index + 1;
		}
	}

	for (let index = preferredStart; index < limit; index += 1) {
		if (BREAK_BEFORE_CHARS.has(text[index])) {
			return index;
		}
	}

	return limit;
}

function advanceOffset(text, offset) {
	const codePoint = text.codePointAt(offset);
	return offset + (codePoint > 0xFFFF ? 2 : 1);
}

function getVisualWidth(char) {
	if (!char) {
		return 0;
	}

	if (char === '\t') {
		return 4;
	}

	const codePoint = char.codePointAt(0);

	if (
		codePoint <= 0x1F
		|| (codePoint >= 0x7F && codePoint <= 0xA0)
		|| (codePoint >= 0x300 && codePoint <= 0x36F)
	) {
		return 0;
	}

	if (
		codePoint >= 0x1100 && (
			codePoint <= 0x115F
			|| codePoint === 0x2329
			|| codePoint === 0x232A
			|| (codePoint >= 0x2E80 && codePoint <= 0xA4CF && codePoint !== 0x303F)
			|| (codePoint >= 0xAC00 && codePoint <= 0xD7A3)
			|| (codePoint >= 0xF900 && codePoint <= 0xFAFF)
			|| (codePoint >= 0xFE10 && codePoint <= 0xFE19)
			|| (codePoint >= 0xFE30 && codePoint <= 0xFE6F)
			|| (codePoint >= 0xFF00 && codePoint <= 0xFF60)
			|| (codePoint >= 0xFFE0 && codePoint <= 0xFFE6)
			|| (codePoint >= 0x1F300 && codePoint <= 0x1FAFF)
			|| (codePoint >= 0x20000 && codePoint <= 0x3FFFD)
		)
	) {
		return 2;
	}

	return 1;
}

function skipLeadingWhitespace(text, offset) {
	let cursor = Math.max(0, Math.min(offset, text.length));
	while (cursor < text.length && /\s/.test(text[cursor])) {
		cursor += 1;
	}

	return cursor;
}

function skipInlineWhitespace(text, offset) {
	let cursor = Math.max(0, Math.min(offset, text.length));
	while (cursor < text.length && /\s/.test(text[cursor]) && text[cursor] !== '\n') {
		cursor += 1;
	}

	return cursor;
}

function clampToReadableOffset(text, offset) {
	return skipLeadingWhitespace(text, Math.max(0, Math.min(offset, text.length)));
}

function findPreviousPageOffset(text, currentOffset, maxCharsPerLine, lineCount) {
	if (currentOffset <= 0) {
		return 0;
	}

	let offset = 0;
	let previousOffset = 0;

	while (offset < currentOffset) {
		const page = buildPage(text, offset, maxCharsPerLine, lineCount);
		if (page.startOffset >= currentOffset || page.nextOffset > currentOffset) {
			break;
		}

		previousOffset = page.startOffset;
		offset = page.nextOffset;
	}

	return previousOffset;
}

module.exports = {
	buildPage,
	findPreviousPageOffset,
};
