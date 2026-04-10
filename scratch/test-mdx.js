import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Just simple regex testing
const content = `
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
function _createMdxContent(props) {
  return jsxs(Fragment, { children: [ jsx("h2", { children: "Dictionaries" }) ] });
}
`;

const jsxHeadingRegex = /(?:jsx|jsxs|createElement)\(\s*(?:_components\.)?["']h2["']\s*,\s*\{(?:[^}]*?\s+)?children\s*:\s*(?:["'](.*?)["']|\{.*?\}|\[.*?\])(?:\s*\}|,\s*)/g;
let match;
while ((match = jsxHeadingRegex.exec(content)) !== null) {
  console.log("MATCH:", match[1]);
}
