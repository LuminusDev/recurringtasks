import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

// Function to convert URLs to clickable links (copied from TaskDetailsProvider)
function convertUrlsToLinks(text: string): string {
	// URL regex pattern that matches http, https, ftp, and www URLs
	const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|ftp:\/\/[^\s]+)/gi;
	return text.replace(urlRegex, (url) => {
		// Ensure URLs have a protocol
		const fullUrl = url.startsWith('www.') ? 'https://' + url : url;
		return `<a href="${fullUrl}" class="clickable-link" target="_blank" rel="noopener noreferrer">${url}</a>`;
	});
}

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('URL conversion test', () => {
		// Test HTTP URLs
		const httpText = 'Check out https://example.com for more info';
		const httpResult = convertUrlsToLinks(httpText);
		assert.strictEqual(httpResult, 'Check out <a href="https://example.com" class="clickable-link" target="_blank" rel="noopener noreferrer">https://example.com</a> for more info');

		// Test HTTPS URLs
		const httpsText = 'Visit https://github.com for the code';
		const httpsResult = convertUrlsToLinks(httpsText);
		assert.strictEqual(httpsResult, 'Visit <a href="https://github.com" class="clickable-link" target="_blank" rel="noopener noreferrer">https://github.com</a> for the code');

		// Test www URLs (should add https://)
		const wwwText = 'Go to www.example.org';
		const wwwResult = convertUrlsToLinks(wwwText);
		assert.strictEqual(wwwResult, 'Go to <a href="https://www.example.org" class="clickable-link" target="_blank" rel="noopener noreferrer">www.example.org</a>');

		// Test text without URLs
		const noUrlText = 'This is just plain text without any URLs';
		const noUrlResult = convertUrlsToLinks(noUrlText);
		assert.strictEqual(noUrlResult, noUrlText);

		// Test multiple URLs in one text
		const multipleUrlsText = 'Check https://example.com and www.test.org';
		const multipleUrlsResult = convertUrlsToLinks(multipleUrlsText);
		assert.strictEqual(multipleUrlsResult, 'Check <a href="https://example.com" class="clickable-link" target="_blank" rel="noopener noreferrer">https://example.com</a> and <a href="https://www.test.org" class="clickable-link" target="_blank" rel="noopener noreferrer">www.test.org</a>');
	});
});
