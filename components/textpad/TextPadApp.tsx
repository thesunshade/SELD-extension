import React, { useState, useEffect, useRef } from 'react';
import { browser } from 'wxt/browser';
import { useGlobalTooltips } from '../shared/useGlobalTooltips';
import { selectionTooltip } from '../../utils/selection-tooltip';
import { getSelectionInShadow } from '../../utils/shadow-selection';
import './TextPadApp.css';


export default function TextPadApp() {
	const [mode, setMode] = useState<'EDIT' | 'SAVE'>('EDIT');
	const [text, setText] = useState('');
	const [theme, setTheme] = useState<'system' | 'dark' | 'light'>('system');

	const [fontScale, setFontScale] = useState(100);
	const containerRef = useRef<HTMLDivElement>(null);

	const modeRef = useRef(mode);
	const textRef = useRef(text);

	useEffect(() => {
		modeRef.current = mode;
		textRef.current = text;
	}, [mode, text]);

	useEffect(() => {
		browser.storage.local.get(['seldTextPadContent', 'theme']).then(res => {
			if (res.seldTextPadContent) {
				setText(res.seldTextPadContent as string);
				setMode('SAVE');
			}
			if (res.theme) {
				setTheme(res.theme as 'system' | 'dark' | 'light');
			}
		});

		const handleStorageChange = (changes: Record<string, any>, namespace: string) => {
			if (namespace === 'local' && changes.theme) {
				setTheme(changes.theme.newValue);
			}
		};

		const handleKeyDown = (e: KeyboardEvent) => {
			if (!(e.ctrlKey || e.metaKey)) return;
			const key = e.key.toLowerCase();

			if (key === 's' && modeRef.current === 'EDIT') {
				e.preventDefault();
				handleSaveEdit();
			} else if (key === 'e' && modeRef.current === 'SAVE') {
				e.preventDefault();
				handleSaveEdit();
			}
		};

		browser.storage.onChanged.addListener(handleStorageChange);
		window.addEventListener('keydown', handleKeyDown);

		return () => {
			browser.storage.onChanged.removeListener(handleStorageChange);
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, []);

	const getThemeClass = () => {
		if (theme === "system") {
			return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark-theme" : "light-theme";
		}
		return theme === "dark" ? "dark-theme" : "light-theme";
	};

	const themeClass = getThemeClass();

	useEffect(() => {
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const handler = () => { setTheme(t => t); };
		mediaQuery.addEventListener("change", handler);
		return () => mediaQuery.removeEventListener("change", handler);
	}, []);

	useGlobalTooltips(containerRef);
	const isMac = /Mac/.test(navigator.userAgent);
	const modifier = isMac ? '⌘' : 'Ctrl';

	const handleSaveEdit = () => {
		if (modeRef.current === 'EDIT') {
			browser.storage.local.set({ seldTextPadContent: textRef.current }).then(() => {
				setMode('SAVE');
			});
		} else {
			setMode('EDIT');
		}
	};

	const handleClear = () => {
		if (confirm("Are you sure you want to clear your text?")) {
			browser.storage.local.remove(['seldTextPadContent']).then(() => {
				setText('');
				setMode('EDIT');
			});
		}
	};

	const increaseFont = () => {
		setFontScale(prev => Math.min(250, prev + 5));
	};

	const decreaseFont = () => {
		setFontScale(prev => Math.max(30, prev - 5));
	};

	const resetFont = () => {
		setFontScale(100);
	};

	const handleSelection = (e: React.MouseEvent) => {
		if (mode !== 'SAVE') return;
		
		// Find the shadow host (seld-sidebar)
		const rootNode = containerRef.current?.getRootNode();
		const host = (rootNode && 'host' in rootNode) ? (rootNode as any).host : null;
		
		// If we are in a shadow root (like the sidebar), use specialized selection logic.
		// Otherwise (like a standalone page), use standard window.getSelection().
		const selection = host ? getSelectionInShadow(host) : window.getSelection();

		if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
			selectionTooltip.destroy();
			return;
		}

		const text = selection.toString().trim();
		if (text.length === 0) {
			selectionTooltip.destroy();
			return;
		}

		// 1. Trigger the TTS/Copy tooltip
		selectionTooltip.handleSelection(selection);

		// 2. Trigger the Word Lookup (for short selections)
		if (text.length < 100) {
			const range = selection.getRangeAt(0);
			window.dispatchEvent(new CustomEvent('seld:search', {
				detail: {
					text,
					range
				}
			}));
		}
	};

	return (
		<div className={`textpad-container seld-theme-vars ${themeClass}`} ref={containerRef}>
			<div className="textpad-header">
				<h1>SELD Text Pad</h1>
				<div className="textpad-actions">

					<div className="textpad-resize">
						<button onClick={decreaseFont} className="textpad-btn resize-btn">
							–
						</button>
						<span className="textpad-scale" onClick={resetFont}>
							{fontScale}%
						</span>
						<button onClick={increaseFont} className="textpad-btn resize-btn">
							+
						</button>
					</div>

					<button onClick={handleSaveEdit} className="textpad-btn primary" data-tippy-content={mode === 'EDIT' ? `${modifier}+S to Save` : `${modifier}+E to Edit`}>
						{mode === 'EDIT' ? 'SAVE' : 'EDIT'}
					</button>
					<button onClick={handleClear} className="textpad-btn danger">
						CLEAR
					</button>
				</div>
			</div>

			<div className="textpad-main">
				{mode === 'EDIT' ? (
					<>
						<label htmlFor="textpad-input-area" className="sr-only">Type or paste Sinhala text here</label>
						<textarea
							id="textpad-input-area"
							className="textpad-input"
							style={{ fontSize: `${fontScale}%` }}
							value={text}
							onChange={e => setText(e.target.value)}
							placeholder="Type or paste your Sinhala text here. Then save to start looking up words."
							autoFocus
						/>
					</>
				) : (
					<div
						className="textpad-display"
						style={{ fontSize: `${fontScale}%` }}
						onMouseUp={handleSelection}
					>
						{text.split('\n').map((paragraph, idx) => (
							<p key={idx}>{paragraph}</p>
						))}
					</div>

				)}
			</div>
		</div>
	);
}