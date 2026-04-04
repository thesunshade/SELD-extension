import { useEffect } from 'react';
import tippy, { delegate } from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/dist/border.css';

/**
 * Options used across global tooltips for consistency.
 */
export const DEFAULT_TIPPY_OPTIONS = {
    animation: 'fade',
    arrow: true,
    delay: [500, 10] as [number, number],
    theme: 'light-border',
};

/**
 * Manually scans a container for elements with `data-tippy-content` and initializes tooltips on them.
 * Use this for dynamically injected content that isn't covered by a persistent delegate.
 */
export function scanForTooltips(container: HTMLElement | null, options?: any) {
    if (!container) return;
    
    // Find all potential tooltip targets
    const targets = Array.from(container.querySelectorAll('[data-tippy-content]'));
    if (targets.length === 0) return;

    tippy(targets, {
        ...DEFAULT_TIPPY_OPTIONS,
        appendTo: () => {
            const root = container.closest('.seld-theme-vars');
            return (root as HTMLElement) || document.body;
        },
        ...options
    });
}

/**
 * A hook that applies Tippy.js tooltips globally to all descendants of a reference container
 * that have a `data-tippy-content` attribute.
 * This dramatically reduces DOM overhead compared to instantiating tooltips per element.
 *
 * @param containerRef Reference to the root container where the delegate listener should be attached.
 * @param options Optional tippy configuration overrides.
 */
export function useGlobalTooltips(
    containerRef: React.RefObject<HTMLElement>,
    options?: any
) {
    useEffect(() => {
        if (!containerRef.current) return;

        const instance = delegate(containerRef.current, {
            target: '[data-tippy-content]',
            ...DEFAULT_TIPPY_OPTIONS,
            appendTo: () => {
                const el = containerRef.current;
                if (el) {
                    const root = el.closest('.seld-theme-vars');
                    if (root) return root as HTMLElement;
                }
                return document.body;
            },
            onShow: (instance) => {
                // Ensure dynamic React state changes to data-tippy-content are reflected
                // since delegate instances cache their content on first hover.
                const currentContent = instance.reference.getAttribute('data-tippy-content');
                if (currentContent && currentContent !== instance.props.content) {
                    instance.setContent(currentContent);
                }
                
                // Allow custom options to override or extend onShow
                if (options?.onShow) {
                    options.onShow(instance);
                }
            },
            ...options
        });

        return () => {
            if (Array.isArray(instance)) {
                instance.forEach(i => i.destroy());
            } else if (instance) {
                instance.destroy();
            }
        };
    }, [containerRef, options]);
}
