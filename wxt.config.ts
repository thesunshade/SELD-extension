import { defineConfig } from 'wxt';

export default defineConfig({
    modules: ['@wxt-dev/module-react'],
    vite: (configEnv) => ({
        server: {
            headers: {
                'Content-Security-Policy': "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:3000 ws://localhost:3000; object-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:3000; frame-src * http://localhost:3000;"
            }
        }
    }),
    manifest: {
        name: 'Sinhala English Learners Dictionary',
        description: 'Lookup Sinhala words from the SELD',
        permissions: ['storage'],
        host_permissions: [
            '<all_urls>',
            'https://translate.google.com/*'
        ],
        web_accessible_resources: [
            {
                matches: ['<all_urls>'],
                resources: ['panel.html', 'panel/*']
            }
        ],
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
    runner: {
        startUrls: [
            'https://tripitaka.online/sutta/334',
            'https://mahamegha.lk/2022/04/23/sirapa-wandanawa/',
            'https://sinhala.adaderana.lk/news/221717'
        ],
    },
});
