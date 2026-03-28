import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CHANGELOG_PATH = path.join(ROOT, 'changelog.md');
const WELCOME_HTML_PATH = path.join(ROOT, 'public/extension-pages/welcome.html');

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function mdToHtml(md) {
  const lines = md.split('\n');
  let html = '';
  let inList = false;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inList) {
        html += '</ul>\n';
        inList = false;
      }
      continue;
    }

    if (trimmed.startsWith('## ')) {
      if (inList) { html += '</ul>\n'; inList = false; }
      html += `<h4>${escapeHtml(trimmed.slice(3))}</h4>\n`;
    } else if (trimmed.startsWith('# ')) {
      if (inList) { html += '</ul>\n'; inList = false; }
      html += `<h3>${escapeHtml(trimmed.slice(2))}</h3>\n`;
    } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      if (!inList) {
        html += '<ul>\n';
        inList = true;
      }
      html += `  <li>${escapeHtml(trimmed.slice(2))}</li>\n`;
    } else {
      if (inList) { html += '</ul>\n'; inList = false; }
      html += `<p>${escapeHtml(trimmed)}</p>\n`;
    }
  }
  if (inList) html += '</ul>\n';
  return html.trim();
}

function run() {
  if (!fs.existsSync(CHANGELOG_PATH)) {
    console.error(`❌ Changelog file not found at ${CHANGELOG_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(WELCOME_HTML_PATH)) {
    console.error(`❌ Welcome HTML file not found at ${WELCOME_HTML_PATH}`);
    process.exit(1);
  }

  const changelog = fs.readFileSync(CHANGELOG_PATH, 'utf-8');
  const lines = changelog.split('\n');
  
  // Skip first line
  const mdContent = lines.slice(1).join('\n').trim();
  const htmlContent = mdToHtml(mdContent);

  const welcomeHtml = fs.readFileSync(WELCOME_HTML_PATH, 'utf-8');

  const START_MARKER = '<!-- CHANGELOG_START -->';
  const END_MARKER = '<!-- CHANGELOG_END -->';

  const originalLink = `https://github.com/thesunshade/SELD-extension/blob/main/changelog.md#experimental-sinhala-english-learners-dictionary-browser-extension`;
  
  const changelogHtml = `			<details class="changelog-details">
				<summary>Latest Changes</summary>
				<div class="changelog-content">${htmlContent}</div>
				<a href="${originalLink}"><span class="badge">View Full Changelog on GitHub 📃</span></a>
			</details>`;

  const markerRegex = new RegExp(`${START_MARKER}[\\s\\S]*?${END_MARKER}`);
  
  if (!markerRegex.test(welcomeHtml)) {
    console.error('❌ Could not find changelog markers in welcome.html');
    process.exit(1);
  }

  const updatedHtml = welcomeHtml.replace(markerRegex, `${START_MARKER}\n${changelogHtml}\n${END_MARKER}`);
  
  fs.writeFileSync(WELCOME_HTML_PATH, updatedHtml, 'utf-8');
  console.log('✅ Injected changelog into welcome.html');
}

run();
