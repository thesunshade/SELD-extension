import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../../components/dictionary/App';
import '../../assets/theme.css';

import { createThemeManager } from '../../utils/themeManager';

document.addEventListener('DOMContentLoaded', () => {
	createThemeManager().setupThemeListeners();
});

ReactDOM.createRoot(document.getElementById('app')!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
);
