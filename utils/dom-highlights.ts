// used to mark words on the page that are exact matches in the dictionary

export const SINHALA_REGEX = /[\u0D80-\u0DFF\u200D\u200C]+/g;

const isInsideSidebar = (node: Node): boolean => {
  const el = node.parentElement;
  return !!el?.closest("#seld-sidebar-root");
};

export const findWordRanges = (targetWords: string[]): Range[] => {
  const ranges: Range[] = [];
  const targetSet = new Set(targetWords);
  if (targetSet.size === 0) return ranges;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
  let node;

  while ((node = walker.nextNode())) {
    const text = node.nodeValue;
    if (!text || text.trim() === "") continue;

    // Skip script, style tags, and sidebar content
    const parentName = node.parentElement?.tagName.toLowerCase();
    if (parentName === "script" || parentName === "style" || parentName === "noscript") continue;
    if (isInsideSidebar(node)) continue;

    let match;
    while ((match = SINHALA_REGEX.exec(text)) !== null) {
      const word = match[0];
      if (targetSet.has(word)) {
        const range = new Range();
        range.setStart(node, match.index);
        range.setEnd(node, match.index + word.length);
        ranges.push(range);
      }
    }
  }
  return ranges;
};

export const extractUniqueSinhalaWords = (): string[] => {
  const words = new Set<string>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
  let node;

  while ((node = walker.nextNode())) {
    const text = node.nodeValue;
    if (!text || text.trim() === "") continue;

    const parentName = node.parentElement?.tagName.toLowerCase();
    if (parentName === "script" || parentName === "style" || parentName === "noscript") continue;
    if (isInsideSidebar(node)) continue;

    let match;
    while ((match = SINHALA_REGEX.exec(text)) !== null) {
      words.add(match[0]);
    }
  }
  return Array.from(words);
};

export const applyHighlights = (words: string[], underlineEnabled: boolean) => {
  if (!underlineEnabled || words.length === 0) {
    if (typeof CSS !== "undefined" && "highlights" in CSS) {
      // @ts-ignore
      CSS.highlights.delete("seld-match");
    }
    return;
  }

  const ranges = findWordRanges(words);
  if (ranges.length > 0 && typeof CSS !== "undefined" && "highlights" in CSS) {
    try {
      // @ts-ignore
      const highlight = new Highlight(...ranges);
      // @ts-ignore
      CSS.highlights.set("seld-match", highlight);
    } catch (e) {
      console.error("Failed to register highlights:", e);
    }
  }
};
