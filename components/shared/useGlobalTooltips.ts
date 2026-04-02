import { useEffect } from 'react';
import tippy, { delegate } from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/dist/border.css';

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
            animation: 'fade',
            arrow: true,
            delay: [500, 10],
            theme: 'light-border',
            appendTo: () => {
                const el = containerRef.current;
                if (el) {
                    const root = el.closest('.seld-theme-vars');
                    if (root) return root as HTMLElement;
                }
                return document.body;
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
