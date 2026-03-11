import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { stardict, IndexEntry, StructuredDefinition } from "../../utils/stardict";
import { transliterateSinhala } from "../../utils/transliterate";
import { getCopyText } from "../../utils/clipboard";
import { browser } from "wxt/browser";
import { DefinitionCard } from "../shared/DefinitionCard";
import "./App.css";

type ViewTab = "browse" | "search";
type SearchScope = "headwords" | "fulltext";

const ITEM_HEIGHT = 140; // Estimated avg height for virtualization
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
	const [selectedLetter, setSelectedLetter] = useState<string | null>(() => {
		return sessionStorage.getItem("dict-letter");
	});
	const [secondaryPrefixes, setSecondaryPrefixes] = useState<string[]>([]);
	const [selectedPrefix, setSelectedPrefix] = useState<string | null>(() => {
		return sessionStorage.getItem("dict-prefix");
	});

	// Search state
	const [searchQuery, setSearchQuery] = useState(() => {
		return sessionStorage.getItem("dict-search") || "";
	});
	const [searchScope, setSearchScope] = useState<SearchScope>(() => {
		return (sessionStorage.getItem("dict-scope") as SearchScope) || "headwords";
	});
	const [searchResults, setSearchResults] = useState<IndexEntry[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	// Book view state (virtualization)
	const [scrollTop, setScrollTop] = useState(0);
	const [viewportHeight, setViewportHeight] = useState(800);

	const [definitionCache, setDefinitionCache] = useState<Map<string, StructuredDefinition[]>>(new Map());
	const [showToast, setShowToast] = useState(false);
	const [toastMessage, setToastMessage] = useState("");

	const bookViewRef = useRef<HTMLDivElement>(null);
	const debounceTimer = useRef<number | null>(null);
	const isManualJump = useRef(false);

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

	// Measure viewport on mount and resize
	useEffect(() => {
		const updateHeight = () => {
			if (bookViewRef.current) setViewportHeight(bookViewRef.current.clientHeight);
		};
		updateHeight();
		window.addEventListener("resize", updateHeight);
		return () => window.removeEventListener("resize", updateHeight);
	}, []);

	// --- Load dictionary entries ---
	useEffect(() => {
		stardict.getAllEntries().then(entries => {
			// Deduplicate by word
			const seen = new Set<string>();
			const unique: IndexEntry[] = [];
			for (const e of entries) {
				if (!seen.has(e.word) && !e.word.startsWith("-")) {
					seen.add(e.word);
					unique.push(e);
				}
			}
			setAllEntries(unique);

			// Build primary letter set from actual entries
			const letters = new Set<string>();
			for (const e of unique) {
				if (e.word.length > 0) {
					letters.add(e.word.charAt(0));
				}
			}
			// Sort Sinhala letters by Unicode code point
			setPrimaryLetters(Array.from(letters).sort((a, b) => a.localeCompare(b, "si")));
		});
	}, []);

	const jumpToPrefix = useCallback((prefix: string, isFromScroll = false) => {
		if (allEntries.length === 0) return;

		const index = allEntries.findIndex(e => e.word.startsWith(prefix));
		if (index === -1) return;

		if (!isFromScroll) {
			isManualJump.current = true;
			if (bookViewRef.current) {
				const targetScroll = index * ITEM_HEIGHT - 20; // Slight offset to show it "higher"
				bookViewRef.current.scrollTop = targetScroll;
				setScrollTop(targetScroll);
			}
			setTimeout(() => { isManualJump.current = false; }, 100);
		}
	}, [allEntries, ITEM_HEIGHT]);

	// --- Initial Jump ---
	const [hasInitialJumped, setHasInitialJumped] = useState(false);
	useEffect(() => {
		if (allEntries.length > 0 && !hasInitialJumped && view === "browse") {
			const prefix = selectedPrefix || selectedLetter;
			if (prefix) {
				jumpToPrefix(prefix);
			}
			setHasInitialJumped(true);
		}
	}, [allEntries, view, jumpToPrefix, hasInitialJumped, selectedLetter, selectedPrefix]);

	// --- Build secondary prefixes when primary letter selected ---
	useEffect(() => {
		if (!selectedLetter || allEntries.length === 0) {
			setSecondaryPrefixes([]);
			return;
		}

		const prefixes = new Set<string>();
		for (const e of allEntries) {
			if (e.word.startsWith(selectedLetter)) {
				prefixes.add(e.word.substring(0, 2));
			}
		}

		const isVowelSign = (char: string) => {
			if (!char) return false;
			const code = char.charCodeAt(0);
			return (
				code === 0x0D82 || code === 0x0D83 || code === 0x0DCA ||
				(code >= 0x0DCF && code <= 0x0DDF) || (code >= 0x0DF2 && code <= 0x0DF3)
			);
		};

		const sortedPrefixes = Array.from(prefixes).sort((a, b) => {
			if (a === b) return 0;
			if (a.charAt(0) !== b.charAt(0)) return a.localeCompare(b, "si");

			const a2 = a.charAt(1);
			const b2 = b.charAt(1);

			// Length 1 (e.g. "න") should come before length 2 (e.g. "නා")
			if (!a2) return -1;
			if (!b2) return 1;

			const aIsVowel = isVowelSign(a2);
			const bIsVowel = isVowelSign(b2);

			// Vowel signs (like 'ා') should come before consonants (like 'ග')
			if (aIsVowel && !bIsVowel) return -1;
			if (!aIsVowel && bIsVowel) return 1;

			return a.localeCompare(b, "si");
		});

		// Filter out the primary letter itself if it's in the list (already covered by "All")
		setSecondaryPrefixes(sortedPrefixes.filter(p => p !== selectedLetter));
	}, [selectedLetter, allEntries]);


	// --- Session storage persistence ---
	useEffect(() => { sessionStorage.setItem("dict-view", view); }, [view]);
	useEffect(() => { sessionStorage.setItem("dict-letter", selectedLetter || ""); }, [selectedLetter]);
	useEffect(() => { sessionStorage.setItem("dict-prefix", selectedPrefix || ""); }, [selectedPrefix]);
	useEffect(() => { sessionStorage.setItem("dict-search", searchQuery); }, [searchQuery]);
	useEffect(() => { sessionStorage.setItem("dict-scope", searchScope); }, [searchScope]);

	// --- Search with debounce ---
	const performSearch = useCallback(async (q: string) => {
		if (!q.trim()) {
			setSearchResults([]);
			setIsSearching(false);
			return;
		}
		setIsSearching(true);

		let results: IndexEntry[];
		if (searchScope === "headwords") {
			results = await stardict.searchWords(q, 200);
		} else {
			results = await stardict.searchFullText(q, 200);
		}
		setSearchResults(results);
		setIsSearching(false);
		if (bookViewRef.current) {
			bookViewRef.current.scrollTop = 0;
			setScrollTop(0);
		}
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

		// Sync Sidebar (un-throttled but light since it's just index math)
		if (view === "browse" && !isManualJump.current && allEntries.length > 0) {
			const index = Math.floor(top / ITEM_HEIGHT);
			const entry = allEntries[Math.min(index, allEntries.length - 1)];
			if (entry) {
				const firstChar = entry.word.charAt(0);
				const prefix = entry.word.substring(0, 2);
				if (selectedLetter !== firstChar) {
					setSelectedLetter(firstChar);
					setSelectedPrefix(null);
				} else if (prefix.length === 2 && prefix !== selectedPrefix) {
					setSelectedPrefix(prefix);
				}
			}
		}
	};

	// --- Data Windowing ---
	const currentEntries = view === "browse" ? allEntries : searchResults;
	const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
	const endIndex = Math.min(currentEntries.length, Math.ceil((scrollTop + viewportHeight) / ITEM_HEIGHT) + OVERSCAN);
	const visibleEntries = useMemo(() => currentEntries.slice(startIndex, endIndex), [currentEntries, startIndex, endIndex]);

	const totalHeight = currentEntries.length * ITEM_HEIGHT;
	const offsetY = startIndex * ITEM_HEIGHT;

	// --- Fetch definitions for visible entries ---
	useEffect(() => {
		const fetchDefs = async () => {
			const newCache = new Map(definitionCache);
			let changed = false;
			for (const entry of visibleEntries) {
				if (!newCache.has(entry.word)) {
					const def = await stardict.getDefinition(entry.word);
					if (def) {
						newCache.set(entry.word, def);
						changed = true;
					}
				}
			}
			if (changed) setDefinitionCache(new Map(newCache));
		};
		fetchDefs();
	}, [visibleEntries]);

	// --- Handlers ---
	const handleSpeak = (text: string) => {
		if (!text) return;
		browser.runtime
			.sendMessage({ action: "GET_TTS_AUDIO", text, tl: "si" })
			.then((response: any) => {
				if (response.audioData) {
					const audio = new Audio(`data:audio/mpeg;base64,${response.audioData}`);
					audio.play().catch(e => console.error("TTS Playback error:", e));
				}
			})
			.catch(e => console.error("Error communicating with background for TTS:", e));
	};

	const handleCopy = async (targetWord: string, specificDefBlock?: string | string[]) => {
		if (!targetWord || !specificDefBlock) return;
		try {
			const { htmlContent, plainText } = getCopyText(targetWord, specificDefBlock);
			const blobHtml = new Blob([htmlContent], { type: "text/html" });
			const blobText = new Blob([plainText], { type: "text/plain" });
			await navigator.clipboard.write([new ClipboardItem({ "text/html": blobHtml, "text/plain": blobText })]);
			setToastMessage("Entry copied!");
			setShowToast(true);
			setTimeout(() => setShowToast(false), 2000);
		} catch (err) {
			console.error("Failed to copy:", err);
			setToastMessage("Failed to copy");
			setShowToast(true);
			setTimeout(() => setShowToast(false), 2000);
		}
	};

	const handleWordClick = (word: string) => {
		setView("search");
		setSearchQuery(word);
	};

	const scrollToEntry = (word: string) => {
		const index = currentEntries.findIndex(e => e.word === word);
		if (index !== -1 && bookViewRef.current) {
			isManualJump.current = true;
			const targetScroll = index * ITEM_HEIGHT - 20; // Consistent offset
			bookViewRef.current.scrollTop = targetScroll;
			setScrollTop(targetScroll);
			setTimeout(() => { isManualJump.current = false; }, 100);
		}
	};

	const handleLetterClick = (letter: string) => {
		setSelectedLetter(letter);
		setSelectedPrefix(null);
		if (view === "browse") {
			jumpToPrefix(letter);
		}
	};

	const handlePrefixClick = (prefix: string | null) => {
		setSelectedPrefix(prefix);
		if (view === "browse") {
			jumpToPrefix(prefix || selectedLetter || "");
		}
	};

	const themeClass = theme === "system"
		? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark-theme" : "light-theme")
		: (theme === "dark" ? "dark-theme" : "light-theme");

	return (
		<div className={`dict-explorer seld-theme-vars ${themeClass}`} style={{ "--font-size-percent": `${fontSize}%` } as any}>
			{/* Left Sidebar */}
			<aside className="dict-sidebar">
				{/* <div className="dict-sidebar-header">
					<h2>SELD Explorer</h2>
				</div> */}
				<div className="dict-tabs">
					<button className={`dict-tab ${view === "browse" ? "active" : ""}`} onClick={() => setView("browse")}>
						Browse
					</button>
					<button className={`dict-tab ${view === "search" ? "active" : ""}`} onClick={() => setView("search")}>
						Search
					</button>
				</div>

				<div className="dict-sidebar-body custom-scroll">
					{view === "browse" && (
						<div className="browse-panel">
							<div className="alphabet-grid">
								{primaryLetters.map(letter => (
									<button
										key={letter}
										className={`alphabet-btn ${selectedLetter === letter ? "active" : ""}`}
										onClick={() => handleLetterClick(letter)}
									>
										{letter}
									</button>
								))}
							</div>

							{selectedLetter && secondaryPrefixes.length > 0 && (
								<div className="secondary-filter">
									<div className="secondary-label">Refine: {selectedLetter}…</div>
									<div className="secondary-grid">
										<button
											className={`secondary-btn ${selectedPrefix === null ? "active" : ""}`}
											onClick={() => handlePrefixClick(null)}
										>
											All
										</button>
										{secondaryPrefixes.map(prefix => (
											<button
												key={prefix}
												className={`secondary-btn ${selectedPrefix === prefix ? "active" : ""}`}
												onClick={() => handlePrefixClick(prefix)}
											>
												{prefix}
											</button>
										))}
									</div>
								</div>
							)}

							{selectedLetter && (
								<div className="browse-count">
									{allEntries.length} entries total
								</div>
							)}
						</div>
					)}

					{view === "search" && (
						<div className="search-panel">
							<input
								type="text"
								className="dict-search-input"
								placeholder="Search dictionary..."
								value={searchQuery}
								onChange={e => setSearchQuery(e.target.value)}
								autoFocus
							/>
							<div className="search-scope-toggle">
								<button
									className={`scope-btn ${searchScope === "headwords" ? "active" : ""}`}
									onClick={() => setSearchScope("headwords")}
								>
									Headwords
								</button>
								<button
									className={`scope-btn ${searchScope === "fulltext" ? "active" : ""}`}
									onClick={() => setSearchScope("fulltext")}
								>
									Full Text
								</button>
							</div>

							{isSearching && <div className="search-status">Searching...</div>}

							<div className="search-results-list custom-scroll">
								{searchResults.map((entry, idx) => (
									<div
										key={idx}
										className="headword-item"
										onClick={() => scrollToEntry(entry.word)}
									>
										{entry.word}
									</div>
								))}
								{!isSearching && searchQuery.trim() && searchResults.length === 0 && (
									<div className="no-results">No results found</div>
								)}
							</div>
						</div>
					)}
				</div>
			</aside>

			{/* Main Content: Book View */}
			<main className="dict-book-view custom-scroll dynamic-font" ref={bookViewRef} onScroll={handleScroll}>
				<div
					className="book-view-virtual-container"
					style={{ height: totalHeight, position: 'relative' }}
				>
					<div
						className="book-view-inner"
						style={{
							transform: `translateY(${offsetY}px)`,
							position: 'absolute',
							top: 0,
							left: 0,
							right: 0
						}}
					>
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
								<div
									key={`${entry.word}-${startIndex + idx}`}
									className="book-entry-card"
									style={{ minHeight: ITEM_HEIGHT }}
								>
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

			{/* Toast */}
			{showToast && <div className="dict-toast">{toastMessage}</div>}
		</div>
	);
}
