import React from 'react';
import ReactDOM from 'react-dom/client';
import TextPadApp from '../../components/textpad/TextPadApp';
import SidebarApp from '../../components/sidebar/App';
import { setupSidebarEvents } from '../../utils/selection-handler';
import '../../assets/theme.css';
import '../../assets/content.css';
import '../../assets/sidebar.css';
import '../../components/sidebar/App.css';
import { createThemeManager } from '../../utils/themeManager';

// 0. Initialize Theme
createThemeManager().setupThemeListeners();

// 1. Mount Text Pad App
const textPadRoot = document.getElementById('textpad-root');
if (textPadRoot) {
	ReactDOM.createRoot(textPadRoot).render(
		<React.StrictMode>
			<TextPadApp />
		</React.StrictMode>
	);
}

// 2. Mount Sidebar App
let interceptLinks = false;
let ctrlClickLookup = true;

const updateSidebarPositionClass = (position: 'left' | 'right') => {
	document.documentElement.classList.remove('seld-pos-left', 'seld-pos-right');
	document.documentElement.classList.add(`seld-pos-${position}`);
};

// Initial load of settings
browser.storage.local.get(['seldSidebarPosition', 'seldInterceptLinkClicks', 'seldCtrlClickLookup']).then(res => {
	const pos = (res.seldSidebarPosition === 'left' || res.seldSidebarPosition === 'right') 
		? res.seldSidebarPosition 
		: 'right';
	updateSidebarPositionClass(pos);
	
	interceptLinks = !!res.seldInterceptLinkClicks;
	ctrlClickLookup = res.seldCtrlClickLookup !== false; // Default to true
});

// React to changes
browser.storage.onChanged.addListener((changes, namespace) => {
	if (namespace === 'local') {
		if (changes.seldSidebarPosition) {
			const nextPos = changes.seldSidebarPosition.newValue;
			if (nextPos === 'left' || nextPos === 'right') {
				updateSidebarPositionClass(nextPos);
			}
		}
		if (changes.seldInterceptLinkClicks) {
			interceptLinks = changes.seldInterceptLinkClicks.newValue;
		}
		if (changes.seldCtrlClickLookup) {
			ctrlClickLookup = changes.seldCtrlClickLookup.newValue;
		}
	}
});

document.documentElement.classList.add('seld-active');
document.body.classList.add('seld-active');

const sidebarRoot = document.getElementById('seld-sidebar-root');
if (sidebarRoot) {
	ReactDOM.createRoot(sidebarRoot).render(
		<React.StrictMode>
			<SidebarApp />
		</React.StrictMode>
	);
}

// 3. Setup Selection Events (treating the Text Pad like a normal webpage)
setupSidebarEvents(
	() => true, // Sidebar is always open on this page
	() => { },    // No need to init, it's already there
	() => interceptLinks,
	() => ctrlClickLookup
);
