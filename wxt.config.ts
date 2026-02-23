import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
    modules: ['@wxt-dev/module-react'],
    manifest: {
        name: 'Sinhala English Learner’s Dictionary',
        description: 'Lookup Sinhala words from the SELD',
        permissions: ['sidePanel', 'storage'],
        host_permissions: [
            '<all_urls>',
            'https://translate.google.com/*'
        ],
        content_security_policy: {
            extension_pages: "script-src 'self'; object-src 'self'; media-src 'self' https://translate.google.com;",
        },
        action: {
            default_title: 'Click to open Dictionary side panel',
            default_icon: {
                "16": "icon-16.png",
                "32": "icon-32.png",
                "48": "icon-48.png",
                "128": "icon-128.png"
            }
        },
    },
    srcDir: '.',
    outDir: '.output',
    extensionApi: 'chrome',
    runner: {
        startUrls: [
            'https://tripitaka.online/sutta/334',
            'https://mahamegha.lk/2022/04/23/sirapa-wandanawa/',
            'https://sinhala.adaderana.lk/news/221717'
        ],
    },
});
