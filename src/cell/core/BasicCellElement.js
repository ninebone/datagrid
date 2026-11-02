export class BasicCellElement extends HTMLElement {

	static _styleCache = new Map();
	static _customStyleCache = new Map(); // 👈 커스텀 스타일용 캐시 추가



	constructor() {
		super();
	}

	applyBaseStyle() {
		const className = this.constructor.name;

		return;
		// 1. 기본 스타일 시트 처리 (캐싱 O)
		if (!ngElement._styleCache.has(className)) {
			const baseSheet = new CSSStyleSheet();
			ngElement._styleCache.set(className, baseSheet);

			const baseUrl = `https://cdn.jsdelivr.net/npm/@ninebone/grid@${__APP_VERSION__}/dist/css/${className}.css`;
			fetch(baseUrl)
				.then(res => res.text())
				.then(cssText => baseSheet.replaceSync(cssText))
				.catch(err => console.error(`Base CSS Load Error:`, err));
		}

		const sheets = [ngElement._styleCache.get(className)];

		// 2. 커스텀 스타일 시트 처리 (자바스크립트 단 캐싱 O)
		if (nine.cssPath) {
			if (!ngElement._customStyleCache.has(className)) {
				const customSheet = new CSSStyleSheet();
				ngElement._customStyleCache.set(className, customSheet);

				// 💡 오타 수정 및 캐시 파라미터 제거
				const customUrl = `${nine.cssPath}/ninegrid/${className}.css`;

				fetch(customUrl)
					.then(res => res.text())
					.then(cssText => customSheet.replaceSync(cssText))
					.catch(err => console.error(`Custom CSS Load Error:`, err));
			}

			// 캐시된 커스텀 시트가 있으면 기본 시트 배열 뒤에 추가
			sheets.push(ngElement._customStyleCache.get(className));
		}

		// 한 번에 섀도우 돔에 적용
		this.shadowRoot.adoptedStyleSheets = sheets;
	}

	connectedCallback() {
		// ngElement 레벨에서는 비워두셔도 됩니다.
	}
}