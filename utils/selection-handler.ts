import { browser } from 'wxt/browser';
import type { ContentScriptContext } from 'wxt/client';
import { checkBloom } from './bloom-data';

function getNGrams(text: string, offset: number): { clickedWord: string, potentialCompounds: string[] } {
	// Need to identify the word at offset first.
	const start = text.substring(0, offset).search(/[\u0D80-\u0DFFa-zA-Z\u200D\u200C]+$/);
	const end = text.substring(offset).search(/[^\u0D80-\u0DFFa-zA-Z\u200D\u200C]/);

	let clickedWord = '';
	let clickWordStart = -1;

	if (start !== -1) {
		clickWordStart = start;
		const actualEnd = end === -1 ? text.length : offset + end;
		clickedWord = text.substring(clickWordStart, actualEnd).trim();
	}

	if (!clickedWord) return { clickedWord: '', potentialCompounds: [] };

	// Parse simple tokens
	const regex = /[\u0D80-\u0DFFa-zA-Z\u200D\u200C]+/g;
	let match;
	const tokens: string[] = [];
	let clickedWordIdx = -1;

	while ((match = regex.exec(text)) !== null) {
		tokens.push(match[0]);
		// Match offset roughly
		if (match.index <= offset && match.index + match[0].length >= offset) {
			clickedWordIdx = tokens.length - 1;
		}
	}

	if (clickedWordIdx === -1) return { clickedWord, potentialCompounds: [] };

	const compounds: string[] = [];
	// Generates 4, 3, 2-grams containing the clicked word
	for (let size = 4; size >= 2; size--) {
		for (let i = 0; i < size; i++) {
			const startIdx = clickedWordIdx - i;
			const endIdx = startIdx + size - 1;

			if (startIdx >= 0 && endIdx < tokens.length) {
				compounds.push(tokens.slice(startIdx, endIdx + 1).join(' '));
			}
		}
	}

	return { clickedWord, potentialCompounds: compounds };
}

export function setupSidebarEvents(
	getIsSidebarOpen: () => boolean,
	initSidebar: () => void,
	ctx?: ContentScriptContext | null
) {
	let lastQueryTime = 0;

	const handleSelection = (e: MouseEvent) => {
		if (!getIsSidebarOpen()) return;
		if (e.target instanceof HTMLElement && e.target.closest('#seld-sidebar-root')) return;

		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0) return;

		const range = selection.getRangeAt(0);
		const textNode = range.startContainer;
		const offset = range.startOffset;

		// Fallback for non-text-node selections or complex ranges
		if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
			const text = selection.toString().trim();
			if (text && text.length > 0 && text.length < 50) {
				const now = Date.now();
				if (now - lastQueryTime > 300) {
					window.dispatchEvent(new CustomEvent('seld:search', { detail: text }));
					lastQueryTime = now;
				}
			}
			return;
		}

		const text = textNode.nodeValue || '';
		const { clickedWord, potentialCompounds } = getNGrams(text, offset);

		let searchTarget = clickedWord;
		let isCompoundMaybe = false;

		for (const compound of potentialCompounds) {
			if (checkBloom(compound)) {
				searchTarget = compound;
				isCompoundMaybe = true;
				break;
			}
		}

		// Use the selection string if clickedWord failed to resolve (e.g. punctuation only)
		const finalFallback = clickedWord || selection.toString().trim();
		if (!finalFallback) return;

		const now = Date.now();
		if (now - lastQueryTime > 300) {
			window.dispatchEvent(
				new CustomEvent('seld:search', {
					detail: isCompoundMaybe ? { primarySearch: searchTarget, fallbackSearch: finalFallback } : finalFallback
				})
			);
			lastQueryTime = now;
		}
	};

	const handleCtrlClick = (e: MouseEvent) => {
		if (!e.ctrlKey) return;
		if (e.target instanceof HTMLElement && e.target.closest('#seld-sidebar-root')) return;

		browser.storage.local.get(['seldCtrlClickLookup']).then((result) => {
			if (result.seldCtrlClickLookup === false) return;

			let textNode: Node | null = null;
			let offset: number = 0;

			if (document.caretRangeFromPoint) {
				const range = document.caretRangeFromPoint(e.clientX, e.clientY);
				if (range) {
					textNode = range.startContainer;
					offset = range.startOffset;
				}
			} else if ((document as any).caretPositionFromPoint) {
				const position = (document as any).caretPositionFromPoint(e.clientX, e.clientY);
				if (position) {
					textNode = position.offsetNode;
					offset = position.offset;
				}
			}

			if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;

			const text = textNode.nodeValue || '';

			const { clickedWord, potentialCompounds } = getNGrams(text, offset);

			let searchTarget = clickedWord;
			let isCompoundMaybe = false;

			for (const compound of potentialCompounds) {
				if (checkBloom(compound)) {
					searchTarget = compound;
					isCompoundMaybe = true;
					break;
				}
			}

			if (searchTarget && searchTarget.length < 50) {
				if (!getIsSidebarOpen()) {
					initSidebar();
				}
				window.dispatchEvent(
					new CustomEvent('seld:search', {
						detail: isCompoundMaybe ? { primarySearch: searchTarget, fallbackSearch: clickedWord } : searchTarget
					})
				);
			}
		});
	};

	// Use ctx.addEventListener when available for auto-cleanup on context invalidation
	if (ctx) {
		ctx.addEventListener(window, 'mouseup', handleSelection);
		ctx.addEventListener(window, 'click', handleCtrlClick);
	} else {
		window.addEventListener('mouseup', handleSelection);
		window.addEventListener('click', handleCtrlClick);
	}

	return () => {
		window.removeEventListener('mouseup', handleSelection);
		window.removeEventListener('click', handleCtrlClick);
	};
}
