const Error404 = () => {
	const handleGoHome = () => {
		window.location.href = '/';
	};

	return (
		<div style={styles.container}>
			<div style={styles.contentBox}>
				<div style={styles.badge}>ERROR CODE</div>

				<h1 style={styles.errorCode}>404</h1>

				<h2 style={styles.title}>Page Not Found</h2>

				<p style={styles.description}>
					요청하신 페이지를 찾을 수 없습니다.<br />
					주소가 변경되었거나 잘못된 경로로 접근하셨을 수 있습니다.
				</p>

				<button
					onClick={handleGoHome}
					style={styles.homeBtn}
					onMouseEnter={(e) => {
						e.currentTarget.style.backgroundColor = '#4338ca';
						e.currentTarget.style.transform = 'translateY(-1px)';
						e.currentTarget.style.boxShadow = '0 6px 20px rgba(79, 70, 229, 0.4)';
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.backgroundColor = '#4f46e5';
						e.currentTarget.style.transform = 'translateY(0)';
						e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.2)';
					}}
				>
					메인 화면으로 돌아가기
				</button>
			</div>
		</div>
	);
};

const styles = {
	container: {
		width: '100%',
		height: '100vh',
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'trasparent',
		fontFamily: "'Segoe UI', Roboto, sans-serif",
		boxSizing: 'border-box',
		position: 'absolute',
		top: 0,
		left: 0
	},
	contentBox: {
		textAlign: 'center',
		padding: '40px',
		backgroundColor: '#2b2b36',
		borderRadius: '12px',
		boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
		border: '1px solid #3f3f4e',
		maxWidth: '440px',
		width: '90%'
	},
	badge: {
		display: 'inline-block',
		padding: '4px 12px',
		backgroundColor: 'rgba(79, 70, 229, 0.15)',
		color: '#818cf8',
		borderRadius: '20px',
		fontSize: '11px',
		fontWeight: '700',
		letterSpacing: '1px',
		marginBottom: '16px'
	},
	errorCode: {
		fontSize: '110px',
		fontWeight: '900',
		margin: '0 0 10px 0',
		color: '#4f46e5',
		letterSpacing: '-3px',
		lineHeight: '1'
	},
	title: {
		fontSize: '24px',
		fontWeight: '700',
		color: '#ffffff',
		margin: '0 0 14px 0'
	},
	description: {
		fontSize: '14px',
		color: '#9a9aab',
		lineHeight: '1.6',
		margin: '0 0 32px 0'
	},
	homeBtn: {
		backgroundColor: '#4f46e5',
		color: '#ffffff',
		border: 'none',
		borderRadius: '6px',
		padding: '14px 28px',
		fontSize: '14px',
		fontWeight: '600',
		cursor: 'pointer',
		boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)',
		transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
		outline: 'none',
		width: '100%'
	}
};

export default Error404;