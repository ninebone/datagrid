import { useEffect, useState } from 'react';

const THEME_STORAGE_KEY = 'nine_table_theme_dark';
const DARK_BG = '#25252b';
const LIGHT_BG = '#ffffff';

const syncThemeToDom = (isDarkTheme, initialRootBg = LIGHT_BG) => {
	const root = document.getElementById('root');

	document.querySelectorAll('nine-table').forEach((el) => {
		if (isDarkTheme) {
			el.setAttribute('theme', 'dark');
		} else {
			el.removeAttribute('theme');
		}
	});

	if (root) {
		root.style.backgroundColor = isDarkTheme ? DARK_BG : (initialRootBg || LIGHT_BG);
	}
};

const TopMenu = () => {
	const [isDark, setIsDark] = useState(() => {
		return localStorage.getItem(THEME_STORAGE_KEY) === 'true';
	});
	const [initialRootBg, setInitialRootBg] = useState('');

	useEffect(() => {
		const root = document.getElementById('root');
		const savedBg = root?.style.backgroundColor || LIGHT_BG;
		setInitialRootBg(savedBg);

		syncThemeToDom(isDark, savedBg);

		const observer = new MutationObserver(() => {
			const currentIsDark = localStorage.getItem(THEME_STORAGE_KEY) === 'true';
			document.querySelectorAll('nine-table').forEach((el) => {
				if (currentIsDark) {
					el.setAttribute('theme', 'dark');
				} else {
					el.removeAttribute('theme');
				}
			});
		});

		observer.observe(document.body, { childList: true, subtree: true });
		return () => observer.disconnect();
	}, []);

	const handleToggleTheme = () => {
		const nextIsDark = !isDark;
		setIsDark(nextIsDark);
		localStorage.setItem(THEME_STORAGE_KEY, String(nextIsDark));
		syncThemeToDom(nextIsDark, initialRootBg);
	};

	return (
		<div style={styles.wrap}>
			<div style={styles.title}>
				Nine Template Workspace
			</div>

			<div style={styles.actions}>
				<button
					type="button"
					onClick={handleToggleTheme}
					style={styles.iconBtn}
					title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
					onMouseEnter={(e) => {
						e.currentTarget.style.backgroundColor = '#383846';
						const svg = e.currentTarget.querySelector('svg');
						if (svg) svg.style.stroke = '#ffffff';
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.backgroundColor = 'transparent';
						const svg = e.currentTarget.querySelector('svg');
						if (svg) svg.style.stroke = '#cccccc';
					}}
				>
					{isDark ? (
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="#cccccc"
							strokeWidth="2.2"
							strokeLinecap="round"
							strokeLinejoin="round"
							style={{ display: 'block', transition: 'stroke 0.2s ease' }}
						>
							<circle cx="12" cy="12" r="4" />
							<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
						</svg>
					) : (
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="#cccccc"
							strokeWidth="2.2"
							strokeLinecap="round"
							strokeLinejoin="round"
							style={{ display: 'block', transition: 'stroke 0.2s ease' }}
						>
							<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
						</svg>
					)}
				</button>
			</div>
		</div>
	);
};

const styles = {
	wrap: {
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		backgroundColor: '#2b2b36',
		color: 'white',
		padding: '0 20px',
		height: '40px',
		width: '100%',
		minHeight: '40px',
		borderBottom: '1px solid #3f3f4e',
		fontFamily: "'Segoe UI', Roboto, sans-serif",
		boxSizing: 'border-box',
	},
	title: {
		fontWeight: '600',
		fontSize: '15px',
		letterSpacing: '0.5px',
		color: '#ffffff'
	},
	actions: {
		display: 'flex',
		alignItems: 'center',
		gap: '8px'
	},
	iconBtn: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'transparent',
		border: 'none',
		borderRadius: '6px',
		width: '28px',
		height: '28px',
		minWidth: '28px',
		minHeight: '28px',
		cursor: 'pointer',
		transition: 'all 0.2s ease',
		outline: 'none',
		padding: 0
	}
};

export default TopMenu;