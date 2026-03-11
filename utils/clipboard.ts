import { StructuredDefinition } from "./stardict";

export const stripHtml = (html: string) => {
	let textWithNewlines = html
		.replace(/<hr[^>]*>/gi, "\n\n")
		.replace(/<br[^>]*>/gi, "\n")
		.replace(/<\/div>/gi, "\n")
		.replace(/<\/p>/gi, "\n\n")
		.replace(/<div class="synthesized-header"[^>]*>/gi, "\n");

	const tmp = document.createElement("DIV");
	tmp.innerHTML = textWithNewlines;
	return (tmp.textContent || tmp.innerText || "").replace(/\n\s*\n/g, "\n\n").trim();
};

export const getCopyText = (word: string, defs: string | string[]) => {
	const joinedDef = Array.isArray(defs) ? defs.join("<hr/>") : defs;
	const htmlContent = `<h2>${word}</h2><div>${joinedDef}</div>`;
	const plainText = `${word}\n\n${stripHtml(joinedDef)}`;
	return { htmlContent, plainText };
};

export const getFullEntryCopyData = (word: string, defs: StructuredDefinition[]) => {
	let allDefs: string[] = [];
	if (defs.length > 1) {
		allDefs = defs.map(b => {
			const header = `<div style="font-weight: bold; font-size: 1.2em; margin-bottom: 8px; margin-top: 4px;">${b.headword}</div><br/>`;
			const homographs = b.homographDefinitions.join("<hr/>");
			return `${header}${homographs}`;
		});
	} else {
		allDefs = defs[0].homographDefinitions;
	}
	return getCopyText(word, allDefs);
};
