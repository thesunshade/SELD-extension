import React from 'react';
import ReactDOM from 'react-dom/client';
import TextPadApp from '../../components/textpad/TextPadApp';
import SidebarApp from '../../components/sidebar/App';
import { setupSidebarEvents } from '../../utils/selection-handler';
import '../../assets/theme.css';
import '../../assets/content.css';
import '../../assets/sidebar.css';
import '../../components/sidebar/App.css';

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
	() => { }    // No need to init, it's already there
);
