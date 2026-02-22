import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
    modules: ['@wxt-dev/module-react'],
    manifest: {
        name: 'Sinhala Dictionary Reference',
        description: 'StarDict dictionary extension for Sinhala lookup',
        permissions: ['sidePanel', 'storage'],
        host_permissions: ['<all_urls>'],
        action: {
            default_title: 'Click to open Dictionary side panel',
        },
    },
    srcDir: '.',
    outDir: '.output',
    extensionApi: 'chrome',
    runner: {
        startUrls: [
            'https://tripitaka.online/sutta/334',
            'https://mahamegha.lk/2022/04/23/sirapa-wandanawa/',
        ],
    },
});
