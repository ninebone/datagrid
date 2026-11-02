import { trace } from "@nopeer";

export class fields {
	#host;
	#fields = [];

	constructor(host) {
		this.#host = host;
		this.#init();
	};

	get() {
		return this.#fields.map(f => f.name);
	};

	getFields() {
		return this.#fields;
	}

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
		const map = new Map();
		this.#fields.forEach(f => {
			map.set(f.name, f.type);
		});

		this.#fields = Array.from(map, ([name, type]) => ({ name, type }));

		this.#fields = this.#fields.filter(f => f.name !== "" && f.name !== "__ng");

		this.#fields.sort((a, b) => { return (a.name.length < b.name.length) ? 1 : -1; });
	};

	#init = () => {
		this.#fields = [];

		const rawTables = Array.from(this.#host.querySelectorAll("table"));

		if (!rawTables || rawTables.length === 0) return;

		for (const tbl of rawTables) {

			tbl.querySelectorAll('[data-bind]').forEach((el) => {
				const fieldName = el.dataset.bind;
				const fieldType = el.getAttribute("data-type") || 'string';

				if (fieldName) {
					this.#fields.push({ name: fieldName, type: fieldType });
				}
			});

			const exprAttrs = [
				"data-expr", "background-color", "color", "tooltip",
				"visible", "readonly", "enable-button", "enable-check",
				"class-expr", "icon-color", "icon-src"
			];

			exprAttrs.forEach(attr => {
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