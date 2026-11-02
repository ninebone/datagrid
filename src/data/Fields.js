import { trace } from "@nopeer";

export class fields {
	#host;
	#fields = []; // 🎯 이제 { name: string, type: string } 객체들의 배열로 관리합니다.

	constructor(host) {
		this.#host = host;
		this.#init();
	};

	// 🎯 기존에 필드 이름만 쓰던 곳들과의 호환을 위해 이름 배열만 리턴하는 메서드 유지
	get() {
		return this.#fields.map(f => f.name);
	};

	// 🎯 내부 객체 통째로 얻기
	getFields() {
		return this.#fields;
	}

	// 🎯 특정 필드의 데이터 타입 조회
	getType(fieldName) {
		const found = this.#fields.find(f => f.name === fieldName);
		return found ? found.type : 'string';
	}

	add = (arr, type = 'string') => {
		arr.forEach(fName => {
			if (!this.#fields.some(f => f.name === fName)) {
				this.#fields.push({ name: fName, type: type });
			}
		});
		this.#adjust();
	};

	indexOf(v) {
		return this.#fields.findIndex(f => f.name === v);
	};

	includes(v) {
		return this.#fields.some(f => f.name === v);
	};

	#adjust = () => {
		// 🎯 이름 기준으로 중복 제거 (Map을 활용하여 마지막에 들어온 타입 유지)
		const map = new Map();
		this.#fields.forEach(f => {
			map.set(f.name, f.type);
		});

		this.#fields = Array.from(map, ([name, type]) => ({ name, type }));

		// 🎯 빈 문자열이나 __ng 필터링
		this.#fields = this.#fields.filter(f => f.name !== "" && f.name !== "__ng");

		// 🎯 긴 이름순 정렬
		this.#fields.sort((a, b) => { return (a.name.length < b.name.length) ? 1 : -1; });
	};

	#init = () => {
		this.#fields = [];

		trace.log(this.#host.querySelectorAll("table"));

		const rawTables = Array.from(this.#host.querySelectorAll("table"));

		if (!rawTables || rawTables.length === 0) return;

		for (const tbl of rawTables) {
			trace.log(tbl);

			// 1. [data-bind] 속성 탐색 및 타입 수집
			tbl.querySelectorAll('[data-bind]').forEach((el) => {
				const fieldName = el.dataset.bind;
				const fieldType = el.getAttribute("data-type") || 'string';

				if (fieldName) {
					this.#fields.push({ name: fieldName, type: fieldType });
				}
			});

			// 2. 표현식 속성들 탐색 (순수 자바스크립트로 변환)
			const exprAttrs = [
				"data-expr", "background-color", "color", "tooltip",
				"visible", "readonly", "enable-button", "enable-check",
				"class-expr", "icon-color", "icon-src"
			];

			exprAttrs.forEach(attr => {
				// 💡 jQuery의 $([attr], tbl).each(...)를 순수 querySelectorAll로 대체
				tbl.querySelectorAll(`[${attr}]`).forEach((el) => {
					let expr = el.getAttribute(attr);
					if (!expr) return;

					if (expr.indexOf("data.") < 0) {
						const lastIndex = expr.search(/[(]/g);

						if (lastIndex > 0) {
							try {
								expr = String(window[expr.substring(0, lastIndex).trim()]);
							} catch (e) {
								expr = "";
							}
						}
					}

					expr.split("data.").forEach(v => {
						if (v.trim() != "") {
							const lastIndex = v.search(/[^_A-Za-z0-9]/g);
							let targetField = '';

							if (lastIndex >= 0) {
								targetField = v.substring(0, lastIndex);
							} else if (expr.startsWith("data.")) {
								targetField = v.replace("data.", "");
							}

							if (targetField) {
								this.#fields.push({ name: targetField, type: 'string' });
							}
						}
					});
				});
			});
		}

		this.#adjust();
	};
};