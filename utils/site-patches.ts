import mahameghaCSS from '../assets/site-patches/mahamegha.lk.css?raw';
import redditCSS from '../assets/site-patches/reddit.com.css?raw';
import wikipediaCSS from '../assets/site-patches/wikipedia.org.css?raw';
import adaderanaCSS from '../assets/site-patches/adaderana.lk.css?raw';
import newsLkCSS from '../assets/site-patches/news.lk.css?raw';
import hirunewsLkCSS from '../assets/site-patches/hirunews.lk.css?raw';
import lankadeepaLkCSS from '../assets/site-patches/lankadeepa.lk.css?raw';
import dailylifeLkCSS from '../assets/site-patches/dailylife.lk.css?raw';
import bbcCSS from '../assets/site-patches/bbc.com.css?raw';



const SITE_PATCH_ID = 'seld-site-patch';

/**
 * A map of base hostnames to the CSS string to inject.
 */
const SITE_PATCHES: Record<string, string> = {
    'mahamegha.lk': mahameghaCSS,
    'reddit.com': redditCSS,
    'wikipedia.org': wikipediaCSS,
    'adaderana.lk': adaderanaCSS,
    'news.lk': newsLkCSS,
    'hirunews.lk': hirunewsLkCSS,
    'lankadeepa.lk': lankadeepaLkCSS,
    'dailylife.lk': dailylifeLkCSS,
    'bbc.com': bbcCSS
};

/**
 * Injects the site-specific CSS patch.
 * It matches the hostname or any parent domain (e.g., en.wikipedia.org matches wikipedia.org).
 */
export function applySitePatch(hostname: string): void {
    // Always clean up first to avoid duplicates
    removeSitePatch();

    const match = Object.keys(SITE_PATCHES).find(key =>
        hostname === key || hostname.endsWith('.' + key)
    );

    const css = match ? SITE_PATCHES[match] : null;
    if (!css) return;

    const style = document.createElement('style');
    style.id = SITE_PATCH_ID;
    style.textContent = css;
    document.head.appendChild(style);
}

/**
 * Removes the injected site CSS patch from document.head.
 */
export function removeSitePatch(): void {
    document.getElementById(SITE_PATCH_ID)?.remove();
}