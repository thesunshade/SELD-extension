const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

const XML_PATH = path.join(__dirname, '../lists.xml');
const OUTPUT_PATH = path.join(__dirname, '../public/abbreviations.json');

const TARGET_GUIDS = {
  'f5e14e68-d8bc-4dfc-b6f8-61955b9dc95c': 'partofspeech',
  'af542404-ea5e-11de-8bde-0013722f8dec': 'usage',
  '487c15b0-2ced-4417-8b77-9075f4a21e5f': 'language',
  'bb372467-5230-43ef-9cc7-4d40b053fb94': 'variantentrytype',
  'b758e2a2-ea5e-11de-9d24-0013722f8dec': 'ownertype_abbreviation',
  '1ee09905-63dd-4c7a-a9bd-1d496743ccd6': 'complexformtype'
};

function extract() {
  const xmlData = fs.readFileSync(XML_PATH, 'utf-8');
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
    processEntities: false
  });
  const jsonObj = parser.parse(xmlData);

  const listsObj = jsonObj.lists || {};
  const listsArr = listsObj.list ? (Array.isArray(listsObj.list) ? listsObj.list : [listsObj.list]) : [];

  const groupedLookup = {};

  function extractText(strNode) {
    if (!strNode) return '';
    if (Array.isArray(strNode)) {
      const parts = strNode.map(s => (typeof s === 'object' ? (s['#text'] || '') : s)).filter(Boolean);
      if (parts.length <= 1) return parts[0] || '';
      return `${parts[0]} (${parts.slice(1).join(', ')})`;
    }
    if (typeof strNode === 'object') return strNode['#text'] || '';
    return strNode;
  }

  function processItem(item, groupName) {
    if (!item) return;

    let fullTerm = extractText(item?.name?.str);
    let abbreviation = extractText(item?.abbr?.str);
    let description = extractText(item?.descr?.str);
    let revname = extractText(item?.revname?.str);

    if (!groupedLookup[groupName]) {
      groupedLookup[groupName] = {};
    }

    if (fullTerm) {
      const payload = {
        fullTerm: String(fullTerm).trim(),
        abbreviation: String(abbreviation).trim(),
        description: String(description).trim(),
      };
      if (abbreviation && String(abbreviation).trim()) groupedLookup[groupName][String(abbreviation).trim()] = payload;
      if (revname && String(revname).trim()) groupedLookup[groupName][String(revname).trim()] = payload;
    }

    // Process subitems
    if (item.subitems) {
      if (item.subitems.positem) {
        const arr = Array.isArray(item.subitems.positem) ? item.subitems.positem : [item.subitems.positem];
        arr.forEach(i => processItem(i, groupName));
      }
      if (item.subitems.item) {
        const arr = Array.isArray(item.subitems.item) ? item.subitems.item : [item.subitems.item];
        arr.forEach(i => processItem(i, groupName));
      }
      if (item.subitems.letitem) {
        const arr = Array.isArray(item.subitems.letitem) ? item.subitems.letitem : [item.subitems.letitem];
        arr.forEach(i => processItem(i, groupName));
      }
      if (item.subitems.lrtitem) {
        const arr = Array.isArray(item.subitems.lrtitem) ? item.subitems.lrtitem : [item.subitems.lrtitem];
        arr.forEach(i => processItem(i, groupName));
      }
    }
  }

  listsArr.forEach(list => {
    const guid = String(list.guidl);
    if (TARGET_GUIDS[guid]) {
      const groupName = TARGET_GUIDS[guid];
      if (list.items) {
        if (list.items.item) {
          const arr = Array.isArray(list.items.item) ? list.items.item : [list.items.item];
          arr.forEach(i => processItem(i, groupName));
        }
        if (list.items.positem) {
          const arr = Array.isArray(list.items.positem) ? list.items.positem : [list.items.positem];
          arr.forEach(i => processItem(i, groupName));
        }
        if (list.items.letitem) {
          const arr = Array.isArray(list.items.letitem) ? list.items.letitem : [list.items.letitem];
          arr.forEach(i => processItem(i, groupName));
        }
        if (list.items.lrtitem) {
          const arr = Array.isArray(list.items.lrtitem) ? list.items.lrtitem : [list.items.lrtitem];
          arr.forEach(i => processItem(i, groupName));
        }
      }
    }
  });

  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(groupedLookup, null, 2), 'utf-8');
  console.log(`✅ Extracted abbreviation data to public/abbreviations.json. Groups: ${Object.keys(groupedLookup).join(', ')}`);
}

extract();
