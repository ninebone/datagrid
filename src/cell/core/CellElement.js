import { trace } from "@nopeer";
import { BasicCellElement } from './BasicCellElement.js';

const exprCache = new Map();
const hostFuncCache = new Map();

export class CellElement extends BasicCellElement {
	#host;
	#sheet;
	#tr;
	#cell;

	#attr;

	constructor() {
		super();
	}

	get host() { return this.#host; }
	get sheet() { return this.#sheet; }
	get cell() { return this.#cell; }
	get tr() { return this.#tr; }
	get attr() { return this.#attr; }

	connectedCallback() {
		super.connectedCallback();

		this.#host = this.getRootNode().host;

		this.#cell = this.closest("th,td");
		this.#tr = this.#cell.closest("tr");
		this.#sheet = this.#tr.closest("nine-table-sheet");

		this.#cell.classList.add(this.tagName);

		this.#attr = {};
		for (let i = 0; i < this.#cell.attributes.length; i++) {
			const name = this.#cell.attributes[i].name;
			if (!["text-align","class","cell-type","data-bind","data-expr","data-col","tabindex"].includes(name)) {
				this.#attr[name] = this.#cell.attributes[i].value;
				//this.setAttribute(name, this.#cell.attributes[i].value);
			}
		}

		if (!this.#cell) return;


		const root = this.shadowRoot || this;

		// 🎯 버튼 이벤트 연결
		root.querySelectorAll("button, ng-expand-button").forEach(button => {
			button.addEventListener("click", () => {
				let fn = this.getAttribute("onbuttonclick") || this.getAttribute("onButtonClick") || this.#cell?.getAttribute("onbuttonclick") || this.#cell?.getAttribute("onButtonClick");

				const rowData = this.data; // Proxy Lazy 접근
				const curRow = parseInt(this.#cell.dataset.row, 10);

				if (fn && this.#host) {
					fn = fn.replace("()", "");
					const match = fn.match(/^(\w+)\s*\(/);
					const methodName = match?.[1] || fn;

					if (typeof this.#host[methodName] === 'function') {
						this.#host[methodName].call(this.#host, rowData, curRow, this.#cell);
					} else if (typeof this.#host.exprFunction === 'function') {
						this.#host.exprFunction(fn).call(this, rowData, curRow);
					}
				}
				/**
				this.#host?.dispatchEvent(new CustomEvent(ninegrid.EVENT.BUTTON_CLICK, {
					detail: { target: this.#cell, data: rowData, currow: curRow },
					bubbles: true,
					composed: true
				})); */
			});
		});

		// 🎯 링크 이벤트 연결
		const renderer = root.querySelector(".renderer");
		if (renderer && this.getAttribute("link") === "true") {
			renderer.classList.add("link");

			renderer.addEventListener("click", () => {
				let fn = this.getAttribute("onlinkclick") || this.getAttribute("onLinkClick");

				const rowData = this.data;
				const curRow = parseInt(this.#cell.dataset.row, 10);

				if (fn && this.#host) {
					fn = fn.replace("()", "");
					const match = fn.match(/^(\w+)\s*\(/);
					const methodName = match?.[1] || fn;

					if (typeof this.#host[methodName] === 'function') {
						this.#host[methodName].call(this.#host, rowData, curRow, this.#cell);
					} else if (typeof this.#host.exprFunction === 'function') {
						this.#host.exprFunction(fn).call(this, rowData, curRow);
					}
				}

				this.#host?.dispatchEvent(new CustomEvent(ninegrid.EVENT.LINK_CLICK, {
					detail: { target: this.#cell, data: rowData, currow: curRow },
					bubbles: true,
					composed: true
				}));
			});
		}
	}

	/**
	 * 🎯 [Proxy 최적화] 속성 읽기 시에도 fields.indexOf() 사용
	 */
	get data() {
		const rawRecord = this.#tr?.data;
		if (!rawRecord) return null;
		if (!rawRecord.v) return rawRecord;

		const host = this.#host;

		return new Proxy(rawRecord, {
			get(target, prop) {
				if (prop === '__ng') return target.__ng;
				if (prop === 'v') return target.v;

				// 💡 host.fields.indexOf(prop) 사용
				const idx = host?.fields?.indexOf?.(prop) ?? -1;
				return idx >= 0 ? target.v[idx] : target[prop];
			}
		});
	}

	/**
	 * 🎯 [핵심] 변환 없이 원시 v 배열에서 direct 인덱스 검색 (GC zero)
	 */
	get value() {
		if (!this.#cell || !this.#tr?.data) return "";

		const bindKey = this.#cell.dataset?.bind;
		if (!bindKey) return "";

		const rawRecord = this.#tr.data;

		// 1. 원시 데이터 배열({ v: [...] }) 구조인 경우
		if (rawRecord.v && Array.isArray(rawRecord.v)) {
			// 💡 fields.indexOf(bindKey)로 바로 찾기!
			const colIdx = this.#host.fields.get().indexOf(bindKey) ?? -1;
			return colIdx >= 0 ? (rawRecord.v[colIdx] ?? "") : "";
		}

		// 2. 일반 JSON 객체인 경우 (하위 호환)
		return rawRecord[bindKey] ?? "";
	}

	set value(v) {
		if (!this.#cell || !this.#host?.data) return;

		const row = parseInt(this.#cell.dataset.row, 10);
		const bindKey = this.#cell.dataset.bind;
		if (isNaN(row) || !bindKey) return;

		const updateRowState = this.getAttribute('update-row-state') !== "false";
		this.#host.data.setValue(row, bindKey, v, updateRowState);
	}

	get row() {
		return parseInt(this.#cell?.dataset?.row, 10);
	}
	get index() {
		return parseInt(this.#cell?.dataset?.index, 10);
	}

	isValid() {
		return this.#cell.classList.contains("invalid") ? false : true;
	}

	isInvalid() {
		return !this.isValid();
	}

	getDisplayText = (defaultValue = "") => {

		if (!this.#cell || !this.#cell.closest("tbody")) return defaultValue;

		const rawRecord = this.#tr.data;

		if (!rawRecord) return defaultValue;

		const expr = this.#cell.dataset.expr;
		const bindKey = this.#cell.dataset.bind;
		const row = parseInt(this.#cell.dataset.row, 10);

		if (expr) {
			try {
				if (this.#tr.getAttribute("grouping") === "true") {
					// 💡 상수가 정의되어 있다면 GROUP_IDX.ID 로 고유 ID 추출 (아니면 배열 인덱스 직접 참조)
					// 배열 구조체인 경우: rawRecord[0]이 groupId임
					//const groupId = Array.isArray(rawRecord) ? rawRecord[0] : (rawRecord.__ng?.id || rawRecord.m?.id);

					// 💡 매니저를 통해 해당 그룹의 자식 레코드 목록을 O(1)로 획득
					//const childRecords = this.#sheet.grouping.getChildrenRecords("g_0");
					//trace.log("--========", childRecords);
					// 그룹 전용 표현식 계산 메서드 호출
					//return "";//this.getGroupExprValue(expr, childRecords, row, this.#cell);

					//trace.log(this, this.#cell.dataset.bind);
					//return "x";//this.data.length;
					return this.getGroupExprValue(expr, this.#tr.data, row, this.#cell);
				} else {
					return this.#host.exprEngine.evaluate(expr, this.#tr.data, row);

					//return this.getExprValue(expr, this.#tr.data, row, this.#cell);
				}
			} catch (e) {
				console.trace(e);
				//console.error("Expr evaluation error:", expr, e);
				return defaultValue;
			}
		}

		if (bindKey) {
			const val = this.value; // 직통 읽기
			return val !== null && val !== undefined ? val : defaultValue;
		}

		return defaultValue;
	};



	refresh() {

		if (!this.#cell || !this.#tr) return;

		const val = this.value; // 원시 배열 직통 조회

		this.#cell.classList.remove("invalid");

		["color","background","background-color","visible","enable","validator"].forEach(v => {

			const expr = this.#attr[v];
			if (expr) {
				const result = this.#host.exprEngine.evaluate(expr, this.#tr.data, parseInt(this.#cell.dataset.row, 10));

				if (v === "validator") {
					if (!result) {
						this.#cell.classList.add("invalid");
					}
				} else if (v === "visible") {
					this.style["display"] = result ? "" : "none";
				} else if (v === "enable") {
					this.querySelectorAll("input, button, textarea, select").forEach($el => {
						$el.disabled = !result;
					});

					if (!!result) {
						this.#cell.removeAttribute("disabled");
					} else {
						this.#cell.setAttribute("disabled", "true");
					}
				} else {
					this.#cell.style[v] = result;
				}
			}
		});

		return val;
	}

	getExprValue(expr, data, row) {
		if (!this.#host || !this.#host.exprEngine || expr === undefined || expr === null || expr === "") return expr;

		return this.#host.exprEngine.evaluate(expr, data, row);
	}

	/**
	 * 🎯 [신규] 그룹 행의 자식 데이터 목록(childRecords)을 기반으로 합계/평균/개수 등을 처리하는 메서드
	 */
	getGroupExprValue = (expr, groupRecord, row, cell) => {
		if (!expr) return "";

		try {
			row = parseInt(row, 10);
			const cleanExpr = expr.replace("()", "").trim();

			// 1. 호스트(컴포넌트)에 정의된 그룹 전용 커스텀 메서드가 있는 경우 우선 위임
			if (this.#host && typeof this.#host[cleanExpr] === 'function') {
				return this.#host[cleanExpr].call(this, groupRecord, row, cell);
			}

			// 2. 기본 내장 집계 함수 파싱 처리 (예: sum(price), count(), avg(score) 등)
			const match = cleanExpr.match(/^(\w+)\s*\(\s*([\w\-]*)\s*\)/);
			if (match) {
				// 💡 groupRecord에서 자식 레코드 목록 안전하게 추출 (indices 배열 -> 실제 레코드 매핑)
				const indices = groupRecord[GROUP_IDX.CHILDREN];
				const allRecords = this.#host?.data?.getArray ? this.#host.data.getArray() : [];
				const childRecords = indices ? indices.map(idx => allRecords[idx]).filter(Boolean) : [];

				const [, funcName, field] = match;
				const host = this.#host;

				switch (funcName.toLowerCase()) {
					case 'count':
						return childRecords.length;

					case 'sum': {
						const colIdx = host?.fields?.indexOf?.(field) ?? -1;
						return childRecords.reduce((acc, record) => {
							const val = colIdx >= 0 ? record.v?.[colIdx] : record[field];
							return acc + (Number(val) || 0);
						}, 0);
					}

					case 'avg': {
						if (childRecords.length === 0) return 0;
						const colIdx = host?.fields?.indexOf?.(field) ?? -1;
						const sum = childRecords.reduce((acc, record) => {
							const val = colIdx >= 0 ? record.v?.[colIdx] : record[field];
							return acc + (Number(val) || 0);
						}, 0);
						return sum / childRecords.length;
					}
				}
			}

			// 3. 호스트의 exprFunction 활용
			if (this.#host && typeof this.#host.exprFunction === 'function') {
				return this.#host.exprFunction(expr).call(this, groupRecord, row, this.#host.data);
			}

			// 4. 💡 캐싱을 적용한 그룹 동적 표현식 평가 (예: "childRecords.reduce(...)")
			// groupRecord 자체나 내부 자식들을 활용하는 표현식 문자열 처리
			// 4. 💡 캐싱을 적용한 그룹 동적 표현식 평가 (안전성 강화 버전)
			if (expr.includes("data.") || expr.includes("childRecords") || expr.includes("groupRecord")) {
				let evalFn = exprCache.get("grp_" + expr);
				if (!evalFn) {
					evalFn = new Function('groupRecord', 'row', 'cell', 'host', `
                   const indices = groupRecord[3]; // GROUP_IDX.CHILDREN = 3
                   const allRecords = host?.data?.getArray ? host.data.getArray() : [];
                   
                   let childRecords = [];
                   if (Array.isArray(indices)) {
                      // indices가 숫자 인덱스 배열인지, rowid 문자열 배열인지 판별하여 안전하게 추출
                      childRecords = indices.map(idx => {
                         if (typeof idx === 'number') {
                            return allRecords[idx];
                         } else {
                            // rowid 등 문자열 식별자인 경우 전체 배열에서 찾거나 dataManager 활용
                            return allRecords.find(r => r?.__ng?.rowid === idx || r?.m?._?.[0] === idx);
                         }
                      }).filter(Boolean);
                   }
                   
                   // 만약 위에서 못 찾았는데 host.grouping을 쓸 수 있다면 매니저 위임 시도
                   if (childRecords.length === 0 && host?.grouping?.getChildrenRecords && groupRecord[0]) {
                      childRecords = host.grouping.getChildrenRecords(groupRecord[0]);
                   }

                   const data = childRecords; // data.length 등을 쓸 수 있도록 호환
                   return ${expr};
                `);
					exprCache.set("grp_" + expr, evalFn);
				}
				return evalFn(groupRecord, row, cell, this.#host);
			}

			return expr;
		} catch (e) {
			console.error("Group expr evaluation error:", expr, e);
			return expr;
		}
	};
}

export class EditableCellElement extends CellElement {

	get host() { return super.host; }
	get sheet() { return super.sheet; }
	get cell() { return super.cell; }
	get tr() { return super.tr; }
	get attr() { return super.attr; }

	getExprValue(expr, data, row, cell) {
		return super.getExprValue(expr, data, row, cell);
	}

	constructor() {
		super();
	}

	connectedCallback() {
		super.connectedCallback();



		/**
		this.querySelectorAll("input, textarea").forEach($el => {
			$el.addEventListener("change", (event) => {
				if (!this.closest("tbody")) return;

				const target = event.target;
				const inputType = target.getAttribute('type');

				if (inputType === "checkbox") {
					const trueVal = super.attr["true-value"] || "Y";
					const falseVal = super.attr["false-value"] || "N";
					this.value = target.checked ? trueVal : falseVal;
				} else {
					let v = target.value;
					const maxbyte = super.attr["maxbyte"];

					trace.log(maxbyte);

					if (maxbyte) {
						const byteLen = nine.getByteLength(v);
						if (byteLen >= parseInt(maxbyte, 10)) {
							v = nine.cut(v, parseInt(maxbyte, 10));
							target.value = v;
						}
					}

					this.value = this.getAttribute("type") === "number" ? (isNaN(v) ? "" : Number(v)) : v;
				}

				super.sheet.invalidate();
			});
		}); */
	}

	refresh() {
		return super.refresh();
	}

	getExprValue = (expr, data, row, cell) => {
		return super.getExprValue(expr, data, row, cell);
	}

	isValid = () => {
		return super.isValid();
	}

	isInvalid = () => {
		return super.isInvalid();
	}
}