## Bugs
- [ ] in a list of usage abbreviations, only the first is clickable
- [ ] transltierations break when word is parsed. e.g. අහසෙහි ->අහස -ෙහි ahasa -ෙhi
- [ ] term in පියාඹන්ට is not clickable
- [ ] for suffix type headwords when the suffix starts with a dash and then a combining vowel, two non-breaking spaces should be inserted betweeen the vowel and the dash
- [ ] remove all transparent/glassmorphism backgrounds from elements, especially history drop down interface on search
- [ ] ගොඩ නැගිල්ල doesn't seem to be in the lexicon
- [ ] adding a new word to the search input should scroll the new results list to the top.

## Search
- [ ] particles should be treated like suffixes, e.g. ත්


## Improvements
- [ ] There should probably be some limit to the "distance" of fuzzy search results. If there are more than two variants, it's probaby not a good potential match.
- [ ] single click or double click option
- [ ] compound verbs in definitions need to be clickable as a unit. like වන්දනා කරනවා.
- [ ] add letter headers in dictionary browser
- [ ] font size of definition is too big relative to the rest of the sidebar. See sccreenshots
- [ ] it appears that `.seld-transliteration` style is in two places.
- [ ] the welcome page is currently being built at build time. This is probably not idea as it messes with versioning. Better to have the final changes to the page by dynamic at time of load.

## Possible new features
- [ ] grammar overview page that provides an interface for lists.xml data
- [ ] underline should be one of three options: off, bold, subtle
- [ ] export words to Anki
- [ ] links to other dictionaries
- [ ] when word is not found, try to break into existing words


## On hold
- [ ] homograph numbers need to be styled in synonym, component parts section. See වන්දනාමාන. It appears that these are not easily accessed.


## done

- [x] add fonts locally
- [x] scrub input so leading trailing spaces and punctuation are removed.
- [x] history
  - [x] back and forward buttons
- [x] read word aloud when open
- [x] ශාක්‍ය, බ්‍රාහ්මණයාට, and anything with a ZWJ(?) is not being underlined when they should be
- [x] actions in one tab affect all other tabs where plugin is open
- [x] way to suggest additions
  - [x] additions when no results are found
  - [x] corrections to words found
- [x] Paste pad where user can put in their own text
- [x] add settings panel to browser side bar
- [x] TTS should play original word, not broken up version
- [x] sidebar doesn't shift properly on text pad page
- [x] Add independent font resizer/selector for Text Pad.
- [x] add save shortcut on text pad
- [x] need some way to give key to abbreviations
- [x] complexformtype are not being linked up properly. E.g. ඉඳලා `yug.` not linking
- [x] export history
- [x] settings panel needs to be scrollable
- [x] searching for පියඹනවා does not return පියාඹනවා. We need a fuzzy kind of search
- [x] dictionary browser should have identical history
- [x] favorites
- [x] add history browser to Dictionary Explorer
- [x] headword button to open dictionary explorer browser (new tab or existing tab?)
- [x] In the sidebar, if you are on settings or info, clicking a history item does not open search.