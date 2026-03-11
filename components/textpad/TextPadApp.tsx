import React, { useState, useEffect } from 'react';
import { browser } from 'wxt/browser';
import './TextPadApp.css';

export default function TextPadApp() {
	const [mode, setMode] = useState<'EDIT' | 'SAVE'>('EDIT');
	const [text, setText] = useState('');
	const [theme, setTheme] = useState<'system' | 'dark' | 'light'>('system');

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

		browser.storage.onChanged.addListener(handleStorageChange);
		return () => browser.storage.onChanged.removeListener(handleStorageChange);
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
		const handler = () => { setTheme(t => t); }; // force re-render
		mediaQuery.addEventListener("change", handler);
		return () => mediaQuery.removeEventListener("change", handler);
	}, []);

	const handleSaveEdit = () => {
		if (mode === 'EDIT') {
			browser.storage.local.set({ seldTextPadContent: text }).then(() => {
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

	return (
		<div className={`textpad-container seld-theme-vars ${themeClass}`}>
			<div className="textpad-header">
				<h1>SELD Text Pad</h1>
				<div className="textpad-actions">
					<button onClick={handleSaveEdit} className="textpad-btn primary">
						{mode === 'EDIT' ? 'SAVE' : 'EDIT'}
					</button>
					<button onClick={handleClear} className="textpad-btn danger">
						CLEAR
					</button>
				</div>
			</div>
			<div className="textpad-main">
				{mode === 'EDIT' ? (
					<textarea
						className="textpad-input"
						value={text}
						onChange={e => setText(e.target.value)}
						placeholder="Type or paste your Sinhala text here..."
						autoFocus
					/>
				) : (
					<div className="textpad-display">
						{text.split('\n').map((paragraph, idx) => (
							<p key={idx}>{paragraph}</p>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
