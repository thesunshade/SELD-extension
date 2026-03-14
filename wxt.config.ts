import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Sinhala English Learner’s Dictionary",
    description: "Lookup Sinhala words from the SELD",
    permissions: ["storage", "activeTab", "notifications"],
    host_permissions: ["https://translate.google.com/*"],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; media-src 'self' data: https://translate.google.com;",
    },
    action: {
      default_title: "Click to open Dictionary side panel",
      default_icon: {
        "16": "icon-16.png",
        "32": "icon-32.png",
        "48": "icon-48.png",
        "128": "icon-128.png",
      },
    },
    web_accessible_resources: [
      {
        resources: ["SELD.idx", "SELD.dict", "assets/fonts/*.ttf", "content-scripts/content.css"],
        matches: ["<all_urls>"],
      },
    ],
    browser_specific_settings: {
      gecko: {
        id: "{bbe80599-3b0c-4add-aef4-e6a03b7057d8}",
        // @ts-ignore
        data_collection_permissions: {
          required: ["none"],
        },
      },
    },
  },

  vite: () => ({
    build: {
      assetsInlineLimit: 0,
    },
  }),

  srcDir: ".",
  outDir: ".output",
  extensionApi: "chrome",
  runner: {
    startUrls: ["https://tripitaka.online/sutta/334", "https://mahamegha.lk/2022/04/23/sirapa-wandanawa/"],
  },
});
