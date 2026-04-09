import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import tippy, { delegate } from "tippy.js";
import { stardict, IndexEntry, StructuredDefinition } from "../../utils/stardict";
import { DEFAULT_SEARCH_LIMIT, DEFAULT_SEARCH_DEBOUNCE_MS } from "../../utils/constants";
import { transliterateSinhala as transliterateSinhalaTxt } from "../../utils/transliterate";
import { browser } from "wxt/browser";
import { DefinitionCard } from "../shared/DefinitionCard";
import { CarterFallbackLink } from "../shared/CarterFallbackLink";
import { SettingsUI } from "../shared/SettingsUI";
import { WordListUI } from "../shared/WordListUI";
import { Theme } from "../shared/types";
import { Highlighter } from "../shared/Highlighter";
import { HistoryNav } from "../shared/HistoryNav";
import { InfoUI } from "../shared/InfoUI";
import { useGlobalTooltips } from "../shared/useGlobalTooltips";
import "./App.css";

type ViewTab = "browse" | "search" | "favorites" | "history" | "settings" | "info";
type SearchScope = "headwords" | "fulltext";

const ITEM_HEIGHT = 140;
const OVERSCAN = 5;

export default function DictionaryApp() {
	// --- State ---
	const [view, setView] = useState<ViewTab>(() => {
		return (sessionStorage.getItem("dict-view") as ViewTab) || "browse";
	});
	const [theme, setTheme] = useState<Theme>("system");
	const [fontSize, setFontSize] = useState(100);
	const [ctrlClickLookup, setCtrlClickLookup] = useState(true);
	const [underlineDictionaryWords, setUnderlineDictionaryWords] = useState(true);
	const [autoPlayTTS, setAutoPlayTTS] = useState(false);
	const [overrideSinhalaFont, setOverrideSinhalaFont] = useState(false);
	const [transliterateSinhala, setTransliterateSinhala] = useState(false);

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
	const [fallbackSearchQuery, setFallbackSearchQuery] = useState("");
	const [searchScope, setSearchScope] = useState<SearchScope>(() => {
		return (sessionStorage.getItem("dict-scope") as SearchScope) || "headwords";
	});
	const [searchResults, setSearchResults] = useState<IndexEntry[]>([]);
	const [isSearching, setIsSearching] = useState(false);

	// History navigation state
	const [history, setHistory] = useState<string[]>([]);
	const historyIndex = useRef(-1);
	const isNavigatingHistory = useRef(false);

	// Favorites state
	const [favorites, setFavorites] = useState<string[]>([]);
	const [historyFiltered, setHistoryFiltered] = useState<string[]>([]);
	const [favoritesFiltered, setFavoritesFiltered] = useState<string[]>([]);

	// Viewport/Scroll state
	const [scrollTop, setScrollTop] = useState(0);
	const [viewportHeight, setViewportHeight] = useState(800);
	const [definitionCache, setDefinitionCache] = useState<Map<string, StructuredDefinition[]>>(new Map());
	const [highlightedWord, setHighlightedWord] = useState<string | null>(null);
	const [showToast, setShowToast] = useState(false);
	const [toastMessage, setToastMessage] = useState("");

	const bookViewRef = useRef<HTMLDivElement>(null);
	const debounceTimer = useRef<number | null>(null);
	const isManualJump = useRef(false);
	const lastContentView = useRef<"browse" | "search" | "favorites" | "history">("browse");

	// Update lastContentView whenever view changes to browse or search
	useEffect(() => {
		if (view === "browse" || view === "search" || view === "favorites" || view === "history") {
			lastContentView.current = view;
		}
	}, [view]);

	const appRef = useRef<HTMLDivElement>(null);
	useGlobalTooltips(appRef);

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
		const settingsConfig: Record<string, (val: any) => void> = {
			theme: v => setTheme(v as Theme),
			fontSize: v => setFontSize(v as number),
			seldCtrlClickLookup: v => setCtrlClickLookup(v as boolean),
			seldUnderlineWords: v => setUnderlineDictionaryWords(v as boolean),
			seldAutoPlayTTS: v => setAutoPlayTTS(v as boolean),
			seldOverrideSinhalaFont: v => setOverrideSinhalaFont(v as boolean),
			transliterateSinhala: v => setTransliterateSinhala(v as boolean),
			seldSearchHistory: v => {
				if (Array.isArray(v)) {
					setHistory(v);
					historyIndex.current = v.length - 1;
				}
			},
			seldFavorites: v => {
				if (Array.isArray(v)) setFavorites(v);
			},
		};

		const keys = Object.keys(settingsConfig);
		browser.storage.local.get(keys).then((res) => {
			Object.entries(res).forEach(([key, value]) => {
				if (value !== undefined && settingsConfig[key]) {
					settingsConfig[key](value);
				}
			});
		});

		const handleStorageChange = (changes: Record<string, any>, namespace: string) => {
			if (namespace === "local") {
				Object.entries(changes).forEach(([key, change]) => {
					if (settingsConfig[key] && change.newValue !== undefined) {
						settingsConfig[key](change.newValue);
					}
				});
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

	const jumpToPrefix = useCallback((prefix: string, isFromScroll = false, index?: number) => {
		const currentView = view === "settings" ? lastContentView.current : view;
		let entries: IndexEntry[] = [];
		if (currentView === "browse") entries = allEntries;
		else if (currentView === "search") entries = searchResults;
		else if (currentView === "history") entries = historyFiltered.map(w => ({ word: w } as IndexEntry));
		else if (currentView === "favorites") entries = favoritesFiltered.map(w => ({ word: w } as IndexEntry));

		if (entries.length === 0) return;

		let targetIndex = index;
		if (targetIndex === undefined) {
			targetIndex = entries.findIndex(e => getEffectiveWord(e.word).startsWith(prefix));
		}

		if (targetIndex === -1 || targetIndex === undefined) return;

		if (!isFromScroll) {
			isManualJump.current = true;
			if (bookViewRef.current) {
				const targetScroll = targetIndex * ITEM_HEIGHT;
				bookViewRef.current.scrollTop = targetScroll;
				setScrollTop(targetScroll);
				setHighlightedWord(entries[targetIndex].word);
			}
			setTimeout(() => { isManualJump.current = false; }, 100);
		}
	}, [allEntries, searchResults, historyFiltered, favoritesFiltered, view]);

	const handleExplorerLinkClick = useCallback((word: string) => {
		const index = allEntries.findIndex(e => e.word === word);
		if (index !== -1) {
			setView("browse");
			setHighlightedWord(word);
			setTimeout(() => {
				jumpToPrefix(word, false, index);
			}, 50);
		}
	}, [allEntries, jumpToPrefix]);

	// --- Handle Word from URL ---
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const word = params.get("word");
		if (word && allEntries.length > 0) {
			const index = allEntries.findIndex(e => e.word === word);
			if (index !== -1) {
				setView("browse");
				// Clear the word param so it doesn't jump back on settings/search toggle
				window.history.replaceState({}, document.title, window.location.pathname);

				setTimeout(() => {
					jumpToPrefix(word, false, index);
				}, 100);
			}
		}
	}, [allEntries, jumpToPrefix]);

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

	const handleWordClick = async (w: string, fallbackWord?: string) => {
		setView("search");
		if (fallbackWord) {
			setSearchQuery(fallbackWord);
			setFallbackSearchQuery(w); // Using this as the booster
			performSearch(fallbackWord, w);
		} else {
			setSearchQuery(w);
			setFallbackSearchQuery("");
			performSearch(w);
		}
	};

	// --- Virtualization & Search Sync ---
	const performSearch = useCallback(async (q: string, booster?: string) => {
		if (!q.trim()) { setSearchResults([]); setIsSearching(false); return; }
		setIsSearching(true);

		let boosterMatches: IndexEntry[] = [];
		let boosterExact: IndexEntry | undefined;

		if (booster) {
			const bSanitized = booster.trim();
			const bMatches = searchScope === "headwords"
				? await stardict.searchWords(bSanitized, 5)
				: await stardict.searchFullText(bSanitized, 5);

			boosterExact = bMatches.find(m => m.word.toLowerCase() === bSanitized.toLowerCase()) || bMatches.find(m => m.isSynthesizedMatch);
			if (boosterExact) {
				boosterMatches = bMatches;
			}
		}

		let results = searchScope === "headwords"
			? await stardict.searchWords(q, DEFAULT_SEARCH_LIMIT)
			: await stardict.searchFullText(q, DEFAULT_SEARCH_LIMIT);

		if (boosterExact) {
			const merged = [...boosterMatches];
			const seen = new Set(merged.map(m => m.word));
			for (const r of results) {
				if (!seen.has(r.word)) {
					merged.push(r);
				}
			}
			results = merged;
		}

		setSearchResults(results);
		setIsSearching(false);
		if (bookViewRef.current) { bookViewRef.current.scrollTop = 0; setScrollTop(0); }
	}, [searchScope]);

	// Debounced history push — fires 1.5 s after the query settles
	useEffect(() => {
		if (view !== "search") return;
		const sanitized = searchQuery.trim();
		if (!sanitized) return;
		const timer = setTimeout(() => {
			if (isNavigatingHistory.current) return;
			setHistory(prev => {
				const truncated = prev.slice(0, historyIndex.current + 1);
				if (truncated.length > 0 && truncated[truncated.length - 1] === sanitized) return truncated;
				const updated = [...truncated, sanitized];
				historyIndex.current = updated.length - 1;
				browser.storage.local.set({ seldSearchHistory: updated });
				return updated;
			});
		}, 1500);
		return () => clearTimeout(timer);
	}, [searchQuery, view]);

	const goBack = async () => {
		if (historyIndex.current <= 0) return;
		historyIndex.current -= 1;
		const word = history[historyIndex.current];
		isNavigatingHistory.current = true;
		setSearchQuery(word);
		await performSearch(word);
		isNavigatingHistory.current = false;
	};

	const goForward = async () => {
		if (historyIndex.current >= history.length - 1) return;
		historyIndex.current += 1;
		const word = history[historyIndex.current];
		isNavigatingHistory.current = true;
		setSearchQuery(word);
		await performSearch(word);
		isNavigatingHistory.current = false;
	};

	const clearHistory = () => {
		setHistory([]);
		historyIndex.current = -1;
		browser.storage.local.set({ seldSearchHistory: [] });
	};

	const downloadHistory = () => {
		const unique = [...new Set(history)];
		const blob = new Blob([unique.join("\n")], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "seld-history.txt";
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleHistoryWordClick = (word: string) => {
		setFallbackSearchQuery("");
		setSearchQuery(word);
		performSearch(word);
	};

	const handleToggleFavorite = useCallback((word: string) => {
		setFavorites(prev => {
			let newFavs: string[];
			if (prev.includes(word)) {
				newFavs = prev.filter(w => w !== word);
			} else {
				newFavs = [...prev, word];
			}
			browser.storage.local.set({ seldFavorites: newFavs });
			return newFavs;
		});
	}, []);

	useEffect(() => {
		if (view === "search") {
			if (debounceTimer.current) clearTimeout(debounceTimer.current);
			debounceTimer.current = window.setTimeout(() => performSearch(searchQuery, fallbackSearchQuery), DEFAULT_SEARCH_DEBOUNCE_MS);
			return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
		}
	}, [searchQuery, fallbackSearchQuery, searchScope, view, performSearch]);

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

	const currentView = view === "settings" ? lastContentView.current : view;
	const currentEntries = useMemo(() => {
		if (currentView === "browse") return allEntries;
		if (currentView === "search") return searchResults;
		if (currentView === "history") return historyFiltered.map(w => ({ word: w, isSynthesizedMatch: false, isFuzzyMatch: false, originalQuery: undefined } as unknown as IndexEntry));
		if (currentView === "favorites") return favoritesFiltered.map(w => ({ word: w, isSynthesizedMatch: false, isFuzzyMatch: false, originalQuery: undefined } as unknown as IndexEntry));
		return [];
	}, [currentView, allEntries, searchResults, historyFiltered, favoritesFiltered]);
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
					newCache.set(entry.word, def && def.length > 0 ? def : []);
					changed = true;
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

	const handleCopy = async ({ copyText, typeName }: { copyText: string; typeName: string }) => {
		try {
			await navigator.clipboard.writeText(copyText);
			setToastMessage(`Copied: ${typeName}`); setShowToast(true); setTimeout(() => setShowToast(false), 2000);
		} catch (err) {
			console.error("Failed to copy: ", err);
			setToastMessage("Failed to copy"); setShowToast(true); setTimeout(() => setShowToast(false), 2000);
		}
	};

	const saveSetting = (key: string, value: any) => {
		browser.storage.local.set({ [key]: value });
	};

	const themeClass = theme === "system"
		? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark-theme" : "light-theme")
		: (theme === "dark" ? "dark-theme" : "light-theme");

	return (
		<div ref={appRef} className={`dict-explorer seld-theme-vars ${themeClass}`} style={{ "--font-size-percent": `${fontSize}%` } as any}>
			<aside className="dict-sidebar">
				<div className="dict-tabs">
					<button data-tippy-content="Browse" className={`seld-btn seld-tab-folder dict-tab ${view === "browse" ? "active" : ""}`} onClick={() => setView("browse")}>
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6C12 6 13.6875 5 16.5 5C19.3125 5 21 6 21 6V19C21 19 19.3125 18 16.5 18C13.6875 18 12 19 12 19V6Z" /><path d="M3 6C3 6 4.6875 5 7.5 5C10.3125 5 12 6 12 6V19C12 19 10.3125 18 7.5 18C4.6875 18 3 19 3 19V6Z" /></svg>
					</button>
					<button data-tippy-content="Search" className={`seld-btn seld-tab-folder dict-tab ${view === "search" ? "active" : ""}`} onClick={() => setView("search")}>
						<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
					</button>
					<button data-tippy-content="Favorites" className={`seld-btn seld-tab-folder dict-tab ${view === "favorites" ? "active" : ""}`} onClick={() => setView("favorites")}>
						<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
					</button>
					<button data-tippy-content="History" className={`seld-btn seld-tab-folder dict-tab ${view === "history" ? "active" : ""}`} onClick={() => setView("history")}>
						<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
					</button>
					<button data-tippy-content="Info" className={`seld-btn seld-tab-folder dict-tab ${view === "info" ? "active" : ""}`} onClick={() => setView("info")}>
						<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
							<path fill="currentColor" d="M12 10.75a.75.75 0 0 1 .75.75v5a.75.75 0 1 1-1.5 0v-5a.75.75 0 0 1 .75-.75M12 9a1 1 0 1 0 0-2a1 1 0 0 0 0 2" />
							<path fill="currentColor" fillRule="evenodd" d="M7.317 3.769a42.5 42.5 0 0 1 9.366 0c1.827.204 3.302 1.642 3.516 3.48c.37 3.156.37 6.346 0 9.503c-.215 1.836-1.69 3.275-3.516 3.48a42.5 42.5 0 0 1-9.366 0c-1.827-.205-3.302-1.644-3.516-3.48a41 41 0 0 1 0-9.504c.214-1.837 1.69-3.275 3.516-3.48m9.2 1.49a41 41 0 0 0-9.034 0A2.486 2.486 0 0 0 5.29 7.423a39.4 39.4 0 0 0 0 9.154a2.486 2.486 0 0 0 2.193 2.163c2.977.333 6.057.333 9.034 0a2.486 2.486 0 0 0 2.192-2.163a39.4 39.4 0 0 0 0-9.154a2.486 2.486 0 0 0-2.192-2.164" clipRule="evenodd" />
						</svg>
					</button>
					<button data-tippy-content="Settings" className={`seld-btn seld-tab-folder dict-tab ${view === "settings" ? "active" : ""}`} onClick={() => setView("settings")}>
						<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
					</button>
				</div>


				<div className="dict-sidebar-body custom-scroll">
					{view === "browse" && (
						<div className="browse-panel">
							<div className="alphabet-grid">
								{primaryLetters.map(letter => (
									<button key={letter} className={`seld-btn seld-btn-secondary alphabet-btn ${selectedLetter === letter ? "active" : ""}`} onClick={() => handleLetterClick(letter)}>{letter}</button>
								))}
							</div>

							{selectedLetter && secondaryPrefixes.length > 0 && (
								<div className="secondary-filter">
									<div className="secondary-label">Form: {selectedLetter}…</div>
									<div className="secondary-grid">
										{secondaryPrefixes.map(prefix => (
											<button key={prefix} className={`seld-btn seld-btn-ghost secondary-btn ${selectedPrefix === prefix ? "active" : ""}`} onClick={() => handlePrefixClick(prefix)}>{prefix}</button>
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
												className={`seld-btn seld-btn-ghost secondary-btn ${selectedTertiaryPrefix === t ? "active" : ""}`}
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
							<HistoryNav
								history={history}
								historyIndex={historyIndex}
								transliterateSinhala={transliterateSinhala}
								onGoBack={goBack}
								onGoForward={goForward}
								onWordClick={handleHistoryWordClick}
								onClear={clearHistory}
								onDownload={downloadHistory}
							/>
							<input type="text" className="dict-search-input" placeholder="Search..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setFallbackSearchQuery(""); }} autoFocus />
							<div className="search-scope-toggle">
								<button className={`seld-btn seld-btn-secondary scope-btn ${searchScope === "headwords" ? "active" : ""}`} onClick={() => setSearchScope("headwords")}>Headwords</button>
								<button className={`seld-btn seld-btn-secondary scope-btn ${searchScope === "fulltext" ? "active" : ""}`} onClick={() => setSearchScope("fulltext")}>Full Text</button>
							</div>
							<div className="search-results-list custom-scroll">
								{searchResults.map((entry, idx) => (
									<div key={idx} className="headword-item" onClick={() => jumpToPrefix(getEffectiveWord(entry.word), false, idx)}>
										<Highlighter text={entry.word} searchTerm={searchQuery} />
										{transliterateSinhala && /[\u0D80-\u0DFF]/.test(entry.word) && <span className="seld-transliteration"> {transliterateSinhalaTxt(entry.word)}</span>}
									</div>
								))}
							</div>
						</div>
					)}

					{view === "settings" && (
						<SettingsUI
							theme={theme}
							setTheme={setTheme}
							fontSize={fontSize}
							setFontSize={setFontSize}
							ctrlClickLookup={ctrlClickLookup}
							setCtrlClickLookup={setCtrlClickLookup}
							underlineDictionaryWords={underlineDictionaryWords}
							setUnderlineDictionaryWords={setUnderlineDictionaryWords}
							autoPlayTTS={autoPlayTTS}
							setAutoPlayTTS={setAutoPlayTTS}
							overrideSinhalaFont={overrideSinhalaFont}
							setOverrideSinhalaFont={setOverrideSinhalaFont}
							transliterateSinhala={transliterateSinhala}
							setTransliterateSinhala={setTransliterateSinhala}
							saveSetting={saveSetting}
						/>
					)}

					{view === "favorites" && (
						<div className="favorites-panel" style={{ height: "100%" }}>
							<WordListUI
								items={favorites}
								transliterateSinhala={transliterateSinhala}
								onItemClick={(word, idx) => jumpToPrefix(word, false, idx)}
								onItemRemove={(word) => handleToggleFavorite(word)}
								onFilteredItemsChange={setFavoritesFiltered}
								emptyMessage="No favorites yet. Add some from the definition cards."
								listType="favorites"
							/>
						</div>
					)}

					{view === "history" && (
						<div className="history-panel" style={{ height: "100%" }}>
							<WordListUI
								items={history}
								transliterateSinhala={transliterateSinhala}
								onItemClick={(word, idx) => jumpToPrefix(word, false, idx)}
								onItemRemove={(word) => {
									setHistory(prev => {
										const newHist = prev.filter(w => w !== word);
										browser.storage.local.set({ seldSearchHistory: newHist });
										return newHist;
									});
								}}
								onFilteredItemsChange={setHistoryFiltered}
								emptyMessage="No search history yet."
								listType="history"
							/>
						</div>
					)}

					{view === "info" && <InfoUI />}
				</div>
			</aside>

			<main className="dict-book-view custom-scroll dynamic-font" ref={bookViewRef} onScroll={handleScroll}>
				<div style={{ height: totalHeight, position: 'relative' }}>
					<div style={{ transform: `translateY(${offsetY}px)`, position: 'absolute', top: 0, left: 0, right: 0 }} className="book-view-inner">
						{visibleEntries.length === 0 && !isSearching && (
							<div className="dict-empty-state">
								{view === "browse"
									? "Select a letter from the alphabet to browse entries."
									: view === "favorites"
										? "No matching favorites."
										: view === "history"
											? "No matching history entries."
											: searchQuery.trim()
												? (
													<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
														<div>No matching entries found.</div>
														<CarterFallbackLink searchTerm={searchQuery} />
													</div>
												)
												: "Type a search query to find entries."}
							</div>
						)}
						{visibleEntries.map((entry, idx) => {
							const defs = definitionCache.get(entry.word);
							const isHighlighted = entry.word === highlightedWord;
							return (
								<div key={`${entry.word}-${startIndex + idx}`} className={`dictionary-browser-entry-card ${isHighlighted ? "highlighted-card" : ""}`} style={{ minHeight: ITEM_HEIGHT }}>
									{defs ? (
										<DefinitionCard
											word={entry.word}
											definition={defs}
											transliterateSinhala={transliterateSinhala}
											onWordClick={handleWordClick}
											onSpeakClick={handleSpeak}
											onCopyClick={handleCopy}
											searchQuery={view === "search" ? searchQuery : undefined}
											showExplorerLink={view === "search"}
											onExplorerClick={handleExplorerLinkClick}
											isFavorite={favorites.includes(entry.word)}
											favoritesList={favorites}
											onToggleFavorite={handleToggleFavorite}
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