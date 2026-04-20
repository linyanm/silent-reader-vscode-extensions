const assert = require('assert');

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
const vscode = require('vscode');
const myExtension = require('../extension');

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

	test('Splits a long txt line into configured visual lines', () => {
		const page = myExtension.buildPage('一'.repeat(200), 0, 80, 3);

		assert.deepStrictEqual(page.lines.map((line) => line.length), [80, 80, 40]);
		assert.strictEqual(page.nextOffset, 200);
	});

	test('Prefers punctuation when splitting long lines', () => {
		const page = myExtension.buildPage(`${'前'.repeat(8)}，${'后'.repeat(20)}`, 0, 12, 3);

		assert.strictEqual(page.lines[0], '前前前前前前前前，');
		assert.ok(page.lines.every((line) => line.length <= 12));
	});
});
