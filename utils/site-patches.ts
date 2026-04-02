import mahameghaCSS from '../assets/site-patches/mahamegha.lk.css?raw';
import redditCSS from '../assets/site-patches/reddit.com.css?raw';

const SITE_PATCH_ID = 'seld-site-patch';

/**
 * A map of hostname (or hostname suffix) to the CSS string to inject.
 * To add a new site: import its CSS file with ?raw and add an entry here.
 */
const SITE_PATCHES: Record<string, string> = {
    'mahamegha.lk': mahameghaCSS,
    'www.mahamegha.lk': mahameghaCSS,
    'reddit.com': redditCSS,
    'www.reddit.com': redditCSS
};

/**
 * Injects the site-specific CSS patch for the given hostname into document.head.
 * Does nothing if no patch is registered for the hostname.
 */
export function applySitePatch(hostname: string): void {
    // Always clean up first to avoid duplicates
    removeSitePatch();

    const css = SITE_PATCHES[hostname];
    if (!css) return;

    const style = document.createElement('style');
    style.id = SITE_PATCH_ID;
    style.textContent = css;
    document.head.appendChild(style);
}

/**
 * Removes the injected site CSS patch from document.head, if present.
 * Safe to call even if no patch was injected.
 */
export function removeSitePatch(): void {
    document.getElementById(SITE_PATCH_ID)?.remove();
}
