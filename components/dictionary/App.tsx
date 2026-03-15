import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { stardict, IndexEntry, StructuredDefinition } from "../../utils/stardict";
import { transliterateSinhala } from "../../utils/transliterate";
import { getCopyText } from "../../utils/clipboard";
import { browser } from "wxt/browser";
import { DefinitionCard } from "../shared/DefinitionCard";
import "./App.css";

type ViewTab = "browse" | "search";
type SearchScope = "headwords" | "fulltext";

const ITEM_HEIGHT = 140;
const OVERSCAN = 5;

export default function DictionaryApp() {
	// --- State ---
	const [view, setView] = useState<ViewTab>(() => {
		return (sessionStorage.getItem("dict-view") as ViewTab) || "browse";
	});
	const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
	const [fontSize, setFontSize] = useState(100);
	const [transliterateHeadwords, setTransliterateHeadwords] = useState(false);
	const [transliterateDefinitions, setTransliterateDefinitions] = useState(false);

	// Browse state
	const [allEntries, setAllEntries] = useState<IndexEntry[]>([]);
	const [primaryLetters, setPrimaryLetters] = useState<string[]>([]);
	const [selectedLetter, setSelectedLetter] = useState<string | null>(() => sessionStorage.getItem("dict-letter") || null);

	const [secondaryPrefixes, setSecondaryPrefixes] = useState<string[]>([]);
	const [selectedPrefix, setSelectedPrefix] = useState<string | null>(() => sessionStorage.getItem("dict-prefix") || null);

	const [tertiaryPrefixes, setTertiaryPrefixes] = useState<string[]>([]);
	const [selectedTertiaryPrefix, setSelectedTertiaryPrefix] = useState<string | null>(() => sessionStorage.getItem("dict-tertiary") || null);

	// Search state
	const [searchQuery, setSearchQuery] = useState(() => sessionStorage.getItem("dict-search") || "");
	const [searchScope, setSearchScope] = useState<SearchScope>(() => {
		return (sessionStorage.getItem("dict-scope") as SearchScope) || "headwords";
	});
	const [searchResults, setSearchResults] = useState<IndexEntry[]>([]);
	const [isSearching, setIsSearching] = useState(false);

	// Viewport/Scroll state
	const [scrollTop, setScrollTop] = useState(0);
	const [viewportHeight, setViewportHeight] = useState(800);
	const [definitionCache, setDefinitionCache] = useState<Map<string, StructuredDefinition[]>>(new Map());
	const [showToast, setShowToast] = useState(false);
	const [toastMessage, setToastMessage] = useState("");

	const bookViewRef = useRef<HTMLDivElement>(null);
	const debounceTimer = useRef<number | null>(null);
	const isManualJump = useRef(false);

	// --- Helpers ---
	const getEffectiveWord = (word: string) => word.startsWith("-") ? word.slice(1) : word;

	const isCombiningMark = (char: string) => {
		const code = char.charCodeAt(0);
		// Sinhala vowel signs + ZWJ (200D) + ZWNJ (200C) + Spaces
		return (code >= 0x0DCA && code <= 0x0DF3) ||
			code === 0x200D ||
			code === 0x200C ||
			char.trim() === "";
	};

	// --- Load settings ---
	useEffect(() => {
		const keys = ["theme", "fontSize", "seldTransliterateHeadwords", "seldTransliterateDefinitions"];
		browser.storage.local.get(keys).then((res) => {
			if (res.theme) setTheme(res.theme as any);
			if (res.fontSize) setFontSize(res.fontSize as number);
			if (res.seldTransliterateHeadwords !== undefined) setTransliterateHeadwords(res.seldTransliterateHeadwords as boolean);
			if (res.seldTransliterateDefinitions !== undefined) setTransliterateDefinitions(res.seldTransliterateDefinitions as boolean);
		});

		const handleStorageChange = (changes: Record<string, any>, namespace: string) => {
			if (namespace === "local") {
				if (changes.theme) setTheme(changes.theme.newValue);
				if (changes.fontSize) setFontSize(changes.fontSize.newValue);
				if (changes.seldTransliterateHeadwords) setTransliterateHeadwords(changes.seldTransliterateHeadwords.newValue);
				if (changes.seldTransliterateDefinitions) setTransliterateDefinitions(changes.seldTransliterateDefinitions.newValue);
			}
		};
		browser.storage.onChanged.addListener(handleStorageChange);
		return () => browser.storage.onChanged.removeListener(handleStorageChange);
	}, []);

	useEffect(() => {
		const updateHeight = () => { if (bookViewRef.current) setViewportHeight(bookViewRef.current.clientHeight); };
		updateHeight();
		window.addEventListener("resize", updateHeight);
		return () => window.removeEventListener("resize", updateHeight);
	}, []);

	// --- Initial Load ---
	useEffect(() => {
		stardict.getAllEntries().then(entries => {
			const seen = new Set<string>();
			const unique: IndexEntry[] = [];
			for (const e of entries) {
				if (!seen.has(e.word)) {
					seen.add(e.word);
					unique.push(e);
				}
			}

			unique.sort((a, b) => getEffectiveWord(a.word).localeCompare(getEffectiveWord(b.word), "si"));

			setAllEntries(unique);
			const letters = new Set<string>();
			for (const e of unique) {
				const eff = getEffectiveWord(e.word);
				if (eff.length > 0) letters.add(eff.charAt(0));
			}
			setPrimaryLetters(Array.from(letters).sort((a, b) => a.localeCompare(b, "si")));
		});
	}, []);

	// --- Session Persistence ---
	useEffect(() => { sessionStorage.setItem("dict-view", view); }, [view]);
	useEffect(() => { sessionStorage.setItem("dict-letter", selectedLetter || ""); }, [selectedLetter]);
	useEffect(() => { sessionStorage.setItem("dict-prefix", selectedPrefix || ""); }, [selectedPrefix]);
	useEffect(() => { sessionStorage.setItem("dict-tertiary", selectedTertiaryPrefix || ""); }, [selectedTertiaryPrefix]);
	useEffect(() => { sessionStorage.setItem("dict-search", searchQuery); }, [searchQuery]);
	useEffect(() => { sessionStorage.setItem("dict-scope", searchScope); }, [searchScope]);

	// --- Refined 3-Level Prefix Logic ---
	useEffect(() => {
		if (!selectedLetter || allEntries.length === 0) {
			setSecondaryPrefixes([]);
			setTertiaryPrefixes([]);
			return;
		}

		const clusterRegex = /^([\u0D80-\u0DFF][\u0DCA-\u0DF3]?)/;

		const secondaries = new Set<string>();
		const entriesForLetter = allEntries.filter(e => getEffectiveWord(e.word).startsWith(selectedLetter));

		for (const e of entriesForLetter) {
			const match = getEffectiveWord(e.word).match(clusterRegex);
			if (match) secondaries.add(match[1]);
		}

		const sortedSecondaries = Array.from(secondaries).sort((a, b) => a.localeCompare(b, "si"));
		setSecondaryPrefixes(sortedSecondaries);

		let effectivePrefix = selectedPrefix;
		if (!selectedPrefix && sortedSecondaries.length > 0) {
			effectivePrefix = sortedSecondaries[0];
			setSelectedPrefix(effectivePrefix);
		}

		const tertiaries = new Set<string>();
		if (effectivePrefix) {
			for (const e of entriesForLetter) {
				const eff = getEffectiveWord(e.word);
				if (eff.startsWith(effectivePrefix)) {
					const remaining = eff.slice(effectivePrefix.length);
					if (remaining.length > 0) {
						const nextChar = remaining.charAt(0);
						if (!isCombiningMark(nextChar)) {
							tertiaries.add(nextChar);
						}
					}
				}
			}
		}

		setTertiaryPrefixes(Array.from(tertiaries).sort((a, b) => a.localeCompare(b, "si")));
	}, [selectedLetter, selectedPrefix, allEntries]);

	const jumpToPrefix = useCallback((prefix: string, isFromScroll = false) => {
		if (allEntries.length === 0 || !prefix) return;
		const index = allEntries.findIndex(e => getEffectiveWord(e.word).startsWith(prefix));
		if (index === -1) return;

		if (!isFromScroll) {
			isManualJump.current = true;
			if (bookViewRef.current) {
				const targetScroll = index * ITEM_HEIGHT;
				bookViewRef.current.scrollTop = targetScroll;
				setScrollTop(targetScroll);
			}
			setTimeout(() => { isManualJump.current = false; }, 100);
		}
	}, [allEntries]);

	// --- Handlers ---
	const handleLetterClick = (letter: string) => {
		setSelectedLetter(letter);
		setSelectedPrefix(null);
		setSelectedTertiaryPrefix(null);
		jumpToPrefix(letter);
	};

	const handlePrefixClick = (prefix: string | null) => {
		setSelectedPrefix(prefix);
		setSelectedTertiaryPrefix(null);
		jumpToPrefix(prefix || selectedLetter || "");
	};

	const handleTertiaryClick = (tPrefix: string | null) => {
		setSelectedTertiaryPrefix(tPrefix);
		const fullPrefix = tPrefix ? (selectedPrefix || selectedLetter || "") + tPrefix : (selectedPrefix || selectedLetter || "");
		jumpToPrefix(fullPrefix);
	};

	const handleWordClick = (w: string) => {
		setView("search");
		setSearchQuery(w);
	};

	// --- Virtualization & Search Sync ---
	const performSearch = useCallback(async (q: string) => {
		if (!q.trim()) { setSearchResults([]); setIsSearching(false); return; }
		setIsSearching(true);
		let results = searchScope === "headwords"
			? await stardict.searchWords(q, 200)
			: await stardict.searchFullText(q, 200);
		setSearchResults(results);
		setIsSearching(false);
		if (bookViewRef.current) { bookViewRef.current.scrollTop = 0; setScrollTop(0); }
	}, [searchScope]);

	useEffect(() => {
		if (view === "search") {
			if (debounceTimer.current) clearTimeout(debounceTimer.current);
			debounceTimer.current = window.setTimeout(() => performSearch(searchQuery), 300);
			return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
		}
	}, [searchQuery, searchScope, view, performSearch]);

	// --- Virtualization Scroll Sync ---
	const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
		const top = e.currentTarget.scrollTop;
		setScrollTop(top);

		if (view === "browse" && !isManualJump.current && allEntries.length > 0) {
			const index = Math.floor(top / ITEM_HEIGHT);
			const entry = allEntries[Math.min(index, allEntries.length - 1)];

			if (entry) {
				const eff = getEffectiveWord(entry.word);
				const firstChar = eff.charAt(0);

				const clusterRegex = /^([\u0D80-\u0DFF][\u0DCA-\u0DF3]?)/;
				const match = eff.match(clusterRegex);
				const currentSecondary = match ? match[1] : firstChar;

				const remaining = eff.slice(currentSecondary.length);
				let currentTertiary = null;
				if (remaining.length > 0) {
					const nextChar = remaining.charAt(0);
					if (!isCombiningMark(nextChar)) {
						currentTertiary = nextChar;
					}
				}

				if (selectedLetter !== firstChar) {
					setSelectedLetter(firstChar);
					setSelectedPrefix(currentSecondary);
					setSelectedTertiaryPrefix(currentTertiary);
				} else {
					if (selectedPrefix !== currentSecondary) {
						setSelectedPrefix(currentSecondary);
						setSelectedTertiaryPrefix(currentTertiary);
					} else if (selectedTertiaryPrefix !== currentTertiary) {
						setSelectedTertiaryPrefix(currentTertiary);
					}
				}
			}
		}
	};

	const currentEntries = view === "browse" ? allEntries : searchResults;
	const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
	const endIndex = Math.min(currentEntries.length, Math.ceil((scrollTop + viewportHeight) / ITEM_HEIGHT) + OVERSCAN);
	const visibleEntries = useMemo(() => currentEntries.slice(startIndex, endIndex), [currentEntries, startIndex, endIndex]);

	const totalHeight = currentEntries.length * ITEM_HEIGHT;
	const offsetY = startIndex * ITEM_HEIGHT;

	useEffect(() => {
		const fetchDefs = async () => {
			const newCache = new Map(definitionCache);
			let changed = false;
			for (const entry of visibleEntries) {
				if (!newCache.has(entry.word)) {
					const def = await stardict.getDefinition(entry.word);
					if (def) { newCache.set(entry.word, def); changed = true; }
				}
			}
			if (changed) setDefinitionCache(new Map(newCache));
		};
		fetchDefs();
	}, [visibleEntries]);

	const handleSpeak = (text: string) => {
		browser.runtime.sendMessage({ action: "GET_TTS_AUDIO", text, tl: "si" }).then((res: any) => {
			if (res.audioData) new Audio(`data:audio/mpeg;base64,${res.audioData}`).play();
		});
	};

	const handleCopy = async (word: string, def: any) => {
		const { htmlContent, plainText } = getCopyText(word, def);
		await navigator.clipboard.write([
			new ClipboardItem({
				"text/html": new Blob([htmlContent], { type: "text/html" }),
				"text/plain": new Blob([plainText], { type: "text/plain" })
			})
		]);
		setToastMessage("Copied!"); setShowToast(true); setTimeout(() => setShowToast(false), 2000);
	};

	const themeClass = theme === "system"
		? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark-theme" : "light-theme")
		: (theme === "dark" ? "dark-theme" : "light-theme");

	return (
		<div className={`dict-explorer seld-theme-vars ${themeClass}`} style={{ "--font-size-percent": `${fontSize}%` } as any}>
			<aside className="dict-sidebar">
				<div className="dict-tabs">
					<button className={`dict-tab ${view === "browse" ? "active" : ""}`} onClick={() => setView("browse")}>Browse</button>
					<button className={`dict-tab ${view === "search" ? "active" : ""}`} onClick={() => setView("search")}>Search</button>
				</div>

				<div className="dict-sidebar-body custom-scroll">
					{view === "browse" && (
						<div className="browse-panel">
							<div className="alphabet-grid">
								{primaryLetters.map(letter => (
									<button key={letter} className={`alphabet-btn ${selectedLetter === letter ? "active" : ""}`} onClick={() => handleLetterClick(letter)}>{letter}</button>
								))}
							</div>

							{selectedLetter && secondaryPrefixes.length > 0 && (
								<div className="secondary-filter">
									<div className="secondary-label">Form: {selectedLetter}…</div>
									<div className="secondary-grid">
										{secondaryPrefixes.map(prefix => (
											<button key={prefix} className={`secondary-btn ${selectedPrefix === prefix ? "active" : ""}`} onClick={() => handlePrefixClick(prefix)}>{prefix}</button>
										))}
									</div>
								</div>
							)}

							{selectedPrefix && tertiaryPrefixes.length > 0 && (
								<div className="secondary-filter tertiary-filter">
									<div className="secondary-label">Next: {selectedPrefix} + ...</div>
									<div className="secondary-grid">
										{tertiaryPrefixes.map(t => (
											<button
												key={t}
												className={`secondary-btn ${selectedTertiaryPrefix === t ? "active" : ""}`}
												onClick={() => handleTertiaryClick(t)}
											>
												{t}
											</button>
										))}
									</div>
								</div>
							)}
						</div>
					)}

					{view === "search" && (
						<div className="search-panel">
							<input type="text" className="dict-search-input" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus />
							<div className="search-scope-toggle">
								<button className={`scope-btn ${searchScope === "headwords" ? "active" : ""}`} onClick={() => setSearchScope("headwords")}>Headwords</button>
								<button className={`scope-btn ${searchScope === "fulltext" ? "active" : ""}`} onClick={() => setSearchScope("fulltext")}>Full Text</button>
							</div>
							<div className="search-results-list custom-scroll">
								{searchResults.map((entry, idx) => (
									<div key={idx} className="headword-item" onClick={() => jumpToPrefix(getEffectiveWord(entry.word))}>{entry.word}</div>
								))}
							</div>
						</div>
					)}
				</div>
			</aside>

			<main className="dict-book-view custom-scroll dynamic-font" ref={bookViewRef} onScroll={handleScroll}>
				<div style={{ height: totalHeight, position: 'relative' }}>
					<div style={{ transform: `translateY(${offsetY}px)`, position: 'absolute', top: 0, left: 0, right: 0 }} className="book-view-inner">
						{visibleEntries.length === 0 && !isSearching && (
							<div className="dict-empty-state">
								{view === "browse"
									? "Select a letter from the alphabet to browse entries."
									: searchQuery.trim()
										? "No matching entries found."
										: "Type a search query to find entries."}
							</div>
						)}
						{visibleEntries.map((entry, idx) => {
							const defs = definitionCache.get(entry.word);
							return (
								<div key={`${entry.word}-${startIndex + idx}`} className="book-entry-card" style={{ minHeight: ITEM_HEIGHT }}>
									{defs ? (
										<DefinitionCard
											word={entry.word}
											definition={defs}
											transliterateHeadwords={transliterateHeadwords}
											transliterateDefinitions={transliterateDefinitions}
											onWordClick={handleWordClick}
											onSpeakClick={handleSpeak}
											onCopyClick={handleCopy}
											searchQuery={view === "search" ? searchQuery : undefined}
										/>
									) : (
										<div className="loading-card">
											<div className="loading-word">{entry.word}</div>
											<div className="loading-skeleton"></div>
										</div>
									)}
								</div>
							);
						})}
					</div>
				</div>
			</main>
			{showToast && <div className="dict-toast">{toastMessage}</div>}
		</div>
	);
}