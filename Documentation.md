# Documentation

## Adding new lists

### 1. Find the GUID and HTML class in `lists.xml`

In your FLEx `lists.xml` file, each list has a unique GUID and the entries are rendered with a specific HTML class. You need to identify both.

### 2. Update `scripts/extract-lists.js`

Add the new list's GUID → class name mapping to the `GUID_TO_CLASS` object at the top of the script:

```js
const GUID_TO_CLASS = {
  'd7f713e8-e8cf-11d3-9764-00c04f186933': 'partofspeech',
  'b40b7bd0-ede4-44c6-ab1a-5eee36d89376': 'usage',
  '2dd51dfb-2b22-4d78-bb74-4837d6863447': 'language',
  'eb3e64ca-301c-432a-bee2-2f642b211e17': 'variantentrytype',
  '24cae482-fc62-43a1-96f0-cff67bb69c52': 'ownertype_abbreviation',
  // Add your new one here:
  'your-new-guid-here': 'yournewclassname',
};
```

The script may also need a tweak if the new list uses a different XML node type (currently it handles `<item>`, `<positem>`, `<letitem>`, and `<lrtitem>`).

### 3. Update `DefinitionCard.tsx`

Add the new class to the Tippy delegate's `target` selector :

```tsx
target: '.partofspeech, .usage, .language, .variantentrytype, .ownertype_abbreviation, .yournewclassname',
```
and
```tsx
const matched = target.closest('.partofspeech, .usage, .language, .variantentrytype, .ownertype_abbreviation, .complexformtype');
```
and
```tsx
						let groupName = Array.from(el.classList).find(c =>
							['partofspeech', 'usage', 'language', 'variantentrytype', 'ownertype_abbreviation', 'complexformtype'].includes(c)
						);
```

### 4. Update `assets/theme.css`

Add the new class to the abbreviation clickable styles:

```css
.partofspeech,
.usage,
.language,
.variantentrytype,
.ownertype_abbreviation,
.yournewclassname {
  /* existing styles */
}
```

And to the hover rule as well.

### 5. Rebuild

Run `npm run dev` or `npm run build`. The pre-build script will re-extract `abbreviations.json` with the new group, and the UI will pick it up automatically.

That's it — just **4 touch points**: the extraction script, the Tippy delegate selector, and the two CSS rule groups in `theme.css`.