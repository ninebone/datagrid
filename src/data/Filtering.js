import { NINE_TABLE } from '@/core/constants.js';
import { trace } from "@nopeer";

/**
 * 🎯 [필터 패널 커스텀 엘리먼트 Light DOM 버전]
 */
export class NineTableFilterPanel extends HTMLElement {
	#sheet;
	#host;
	#nineTable;
	#view;
	#button;
	currentCol = null;

	connectedCallback() {
		this.#init();
		document.addEventListener("mousedown", this.#closeHandler);
	}

	#init = () => {
		//setTimeout(() => {
			this.#renderer();

			this.#sheet = this.closest("nine-table-sheet");
			this.#host = this.getRootNode().host;

			this.#nineTable = this.querySelector("nine-table-simple");

			setTimeout(() => {
				this.#view = this.#nineTable.shadowRoot.querySelector("nine-table-sheet");
			})


			this.querySelector(".search-box").addEventListener("focusin", (e) => {
				e.stopPropagation();
			});
			this.querySelector(".search-box").addEventListener("input", this.#onInput);
			this.querySelector("#chkSelectAll").addEventListener("change", this.#onSelectAll);
			this.querySelector("#btnOk").addEventListener("click", this.#onOk);
		//});
	}

	#renderer = () => {
		this.innerHTML = `
            <input type="text" class="search-box" placeholder="Search...">
            
            <nine-table-simple class="filter-list" theme="simple">
                <table auto-fit-col="true">
                    <colgroup>
                        <col width="32" fixed="left" />
                        <col width="180" />
                        <col width="0" fixed="right"/>
                    </colgroup>
                    <tbody>
                        <tr>
                            <td cell-type="checkbox" data-bind="CHK"></td>
                            <td data-bind="DATA2" html="true"></td>
                            <td data-bind="DATA"></td>
                        </tr>
                    </tbody>
                </table>
            </nine-table-simple>

            <div class="footer-section">
                <div class="footer-btns">
                    <label><input type="checkbox" id="chkSelectAll" checked> Select All</label>
                    <div class="btn-group">
                        <button id="btnOk">Apply</button>
                    </div>
                </div>
            </div>
        `;
	}

	open(filterBtn) {
		this.#button = filterBtn;

		const cell = filterBtn.closest("th, td");
		this.currentCol = cell?.dataset.col;

		const cellRect = cell.getBoundingClientRect();
		const sheetRect = this.#sheet.getBoundingClientRect();

		const panelWidth = this.offsetWidth || 240;
		let left = (cellRect.right - sheetRect.left) - panelWidth;
		let top = cellRect.bottom - sheetRect.top;

		if (left < 0) {
			left = Math.max(0, cellRect.left - sheetRect.left);
		}

		this.style.left = `${left}px`;
		this.style.top = `${top}px`;

		const searchBox = this.querySelector(".search-box");
		searchBox.value = "";


		this.classList.add("active");
		this.classList.add("loading");

		setTimeout(() => {
			try {
				this.#loadVirtualFilterItems();
				this.#view.rowManager.scrollToDataRow(0);
				searchBox.focus();
			} finally {
				this.classList.remove("loading");
			}
		});
	}

	#closeHandler = (e) => {
		const path = e.composedPath ? e.composedPath() : [];
		if (path.includes(this) || (this.#button && path.includes(this.#button))) {
			return;
		}
		this.close();
	};

	close() {
		this.currentCol = null;
		this.classList.remove("active");
		this.#button = null;
	}

	#loadVirtualFilterItems() {
		const filteredRecords = this.#host.data.getArray();
		const targetCols = this.#button?.columns || []; // [{ bind, expr }] 형태 배열
		const fields = this.#host.fields.get() || [];
		const activeFilters = this.#sheet.filtering?.filters || {};
		const exprEngine = this.#host.exprEngine;

		const ds = targetCols.flatMap((colInfo) => {
			const bindKey = colInfo.bind;
			const exprKey = colInfo.expr;

			const filterKey = bindKey || exprKey; // 실제 필터 파라미터 키로 사용
			const fieldIdx = bindKey ? fields.indexOf(bindKey) : -1;
			const activeSelectedVals = activeFilters[filterKey] || [];

			// 1. Map을 이용한 O(N) 고속 유니크 추출 (DATA는 bind/원시값, DATA2는 expr 연산 결과)
			const uniqueMap = new Map();
			for (let i = 0; i < filteredRecords.length; i++) {
				const record = filteredRecords[i];
				if (!record) continue;

				// DATA 기준이 될 원시 값 (bind가 있으면 필드 인덱스에서, 없으면 expr 결과)
				let rawVal = undefined;
				if (fieldIdx >= 0 && record.v) {
					rawVal = record.v[fieldIdx];
				} else if (bindKey && bindKey.includes("data.")) {
					rawVal = exprEngine ? exprEngine.evaluate(bindKey, record, i) : undefined;
				} else if (exprKey && exprEngine) {
					rawVal = exprEngine.evaluate(exprKey, record, i);
				}

				// DATA2에 출력될 화면 표시 값 (expr 수식 연산 결과, 없으면 rawVal)
				let displayVal = rawVal;
				if (exprKey && exprEngine) {
					displayVal = exprEngine.evaluate(exprKey, record, i);
				}

				if (displayVal !== undefined && displayVal !== null && !uniqueMap.has(displayVal)) {
					uniqueMap.set(displayVal, {
						v: rawVal,       // 💡 필터링 비교 기준 (DATA)
						v2: displayVal   // 💡 화면 출력 기준 (DATA2)
					});
				}
			}

			const uniqueList = [...uniqueMap.values()];

			// 2. 출력값(v2) 기준 정렬
			// 2. 출력값(v2) 기준 정렬 (숫자와 문자열 분기 처리)
			uniqueList.sort((a, b) => {
				const valA = a.v2;
				const valB = b.v2;

				// 빈 값이나 null 처리를 위한 안전 장치
				if (valA === valB) return 0;
				if (valA === undefined || valA === null || valA === '') return 1;
				if (valB === undefined || valB === null || valB === '') return -1;

				const numA = Number(valA);
				const numB = Number(valB);

				// 둘 다 유효한 숫자일 경우 숫자 크기 비교
				const isNumA = !isNaN(numA);
				const isNumB = !isNaN(numB);

				if (isNumA && isNumB) {
					return numA - numB;
				}

				// 그 외의 경우는 문자열(localeCompare) 비교
				return String(valA).localeCompare(String(valB));
			});
			activeSelectedVals.sort((a, b) => { return a > b ? 1 : -1; });

			return uniqueList.map(o => ({
				LVL: 2,
				DATA: o.v,  // 필터링 비교용 값
				DATA2: (o.v2 === "" || o.v2 === null || o.v2 === undefined) ? '<span class="empty-value">(empty)</span>' : o.v2, // 화면 출력용 값
				COLNM: filterKey,
				CHK: activeSelectedVals.length === 0 || activeSelectedVals.nineBinarySearch(o.v) >= 0 ? "Y" : "N"
			}));
		});

		this.#nineTable.data.set(ds);

		const selectAllChk = this.querySelector("#chkSelectAll");
		if (selectAllChk) {
			selectAllChk.checked = ds.length > 0 && ds.every(item => item.CHK === "Y");
		}
	}

	#onOk = () => {
		this.#host.loading = true;

		const filterRecords = this.#view.view.getArray();
		const fields = this.#nineTable.data.getHostFields();

		const checkedRecords = filterRecords.filter(record => {
			const chk = record.v[fields.indexOf("CHK")];
			return (chk === "Y" || chk === true);
		});

		const filterParams = { ...(this.#sheet.filtering?.filters || {}) };

		this.#button.columns.forEach(colInfo => {
			const filterKey = colInfo.expr || colInfo.bind;
			const fieldIdx = colInfo.expr ? fields.indexOf("DATA2") : fields.indexOf("DATA");
			const selectedVals = checkedRecords.map(r => r.v[fieldIdx]);

			if (selectedVals.length > 0) {
				filterParams[filterKey] = selectedVals;
			} else {
				delete filterParams[filterKey];
			}
		});

		const totalCount = this.#nineTable.data.count();

		setTimeout(() => {
			try {
				if (totalCount === checkedRecords.length) {
					this.#button.columns.forEach(colInfo => {
						const filterKey = colInfo.expr || colInfo.bind;
						if (filterKey) this.#sheet.filtering.clear(filterKey);
					});
				} else {
					this.#sheet.filtering.set(filterParams);
				}

				this.#sheet.querySelectorAll("nine-table-filter-button").forEach(btn => {
					btn.updateFilteredState();
				});

				this.#sheet.invalidate();
				this.close();
			} finally {
				this.#host.loading = false;
			}
		});
	};

	#onInput = (e) => {

		const query = e.target.value.toLowerCase().trim();

		if (!query) {
			this.#view.filtering.clear();
		} else {
			const rawRecords = this.#nineTable.data.getArray();
			const fields = this.#nineTable.data.getHostFields();
			const data2Idx = fields.indexOf("DATA2");

			const matchedValues = [];
			rawRecords.forEach(record => {
				const val = data2Idx >= 0 && record.v ? record.v[data2Idx] : "";
				const textVal = String(val).replace(/<[^>]*>?/gm, '').toLowerCase();

				// 💡 expr 연산 결과가 담긴 DATA2 텍스트와 검색어 비교
				if (textVal.includes(query)) {
					matchedValues.push(val);
				}
			});

			trace.log(matchedValues);

			this.#view.filtering.set({
				DATA2: [...new Set(matchedValues)]
			});
		}
	};

	#onSelectAll = (e) => {
		const isChecked = e.target.checked;
		const rawRecords = this.#nineTable?.data?.getArray() || [];
		const fields = this.#nineTable.data.getHostFields();
		const chkIdx = fields.indexOf("CHK");

		if (chkIdx >= 0) {
			rawRecords.forEach(record => {
				record.v[chkIdx] = isChecked ? "Y" : "N";
			});
		}

		this.#nineTable.refresh();
	};

	#onCancel = () => {
		this.close();
	};
}

export class NineTableFilterButton extends HTMLElement {
	#sheet;
	#columns = null;

	connectedCallback() {
		this.#sheet = this.closest("nine-table-sheet") || this.getRootNode().host;
		this.removeEventListener("click", this.#onClick);
		this.addEventListener("click", this.#onClick);
	}

	get columns() {
		if (this.#columns) return this.#columns;

		const cell = this.closest("th, td");
		const colIndex = cell?.dataset.col;
		const sourceTable = this.#sheet.sourceTable;

		const cols = [];
		const seen = new Set();

		if (sourceTable && colIndex !== undefined) {
			sourceTable.querySelectorAll(`tbody [data-col="${colIndex}"]`).forEach($td => {
				const bindKey = $td.dataset.bind;
				const exprKey = $td.dataset.expr;

				if (bindKey || exprKey) {
					const uniqueKey = `${bindKey || ''}_${exprKey || ''}`;
					if (!seen.has(uniqueKey)) {
						seen.add(uniqueKey);
						cols.push({
							bind: bindKey,
							expr: exprKey,
						});
					}
				}
			});
		}

		this.#columns = cols;
		return this.#columns;
	}

	updateFilteredState = () => {
		const activeFilters = this.#sheet.filtering?.filters || {};
		const isFiltered = this.columns.some(colInfo => {
			const key = colInfo.expr || colInfo.bind;
			return key && activeFilters[key] && activeFilters[key].length > 0;
		});
		this.classList.toggle('filtered', isFiltered);
	};

	#onClick = (e) => {
		trace.log(e);

		e.preventDefault();
		e.stopPropagation();

		const panel = this.#sheet.querySelector("nine-table-filter-panel");
		const cell = this.closest("th, td");
		const col = cell.dataset.col;

		//trace.log(panel, cell, col, panel.currentCol, panel.classList.contains('active'));

		if (panel && panel.currentCol === col && panel.classList.contains('active')) {
			panel.close();
		} else if (panel) {
			panel.open(this);
		}
	};
}

export class Filtering {
	#sheet;
	#host;
	#isFiltering = false;
	#filterPanel = null;
	#filters = {};

	constructor(sheet) {
		this.#sheet = sheet;
		this.#host = this.#sheet.getRootNode().host;
		this.#init();
	}

	get filters() {
		return this.#filters;
	};

	#init = () => {
		this.#initFilterPanel();
	}

	#initFilterPanel = () => {
		if (this.#host.tagName.toLowerCase() === "nine-table-simple") {
			return;
		}

		let panel = this.#sheet.querySelector("nine-table-filter-panel");
		if (!panel) {
			panel = document.createElement("nine-table-filter-panel");
			this.#sheet.appendChild(panel);
		}
		this.#filterPanel = panel;
	}

	isFiltering() {
		return this.#isFiltering;
	}

	clear = (colnm) => {
		if (colnm) {
			delete this.#filters[colnm];
		} else {
			this.#filters = {};
		}

		this.#isFiltering = Object.keys(this.#filters).length > 0;
		this.#applyFiltering();

		this.#sheet.querySelectorAll("nine-table-filter-button").forEach(btn => {
			btn.updateFilteredState();
		});

		trace.log(`🔄 [NineTableFiltering] Filter cleared for ${colnm || 'all'}`);
	}

	set = (oFilter) => {

		trace.log(oFilter);

		let jsonFilter = Array.isArray(oFilter)
			? Object.fromEntries(Object.keys(oFilter[0]).map(k => [k, [...new Set(oFilter.map(item => item[k]))]]))
			: oFilter;

		this.#filters = jsonFilter;
		this.#isFiltering = Object.keys(jsonFilter).length > 0;
		this.#sheet.toggleAttribute("filtering", this.#isFiltering);

		this.#applyFiltering();
	}

	#applyFiltering() {
		const hostData = this.#host.data;
		const rawRecords = hostData.getArray();
		const fields = this.#host.data.getHostFields();
		const sheetIndex = this.#sheet.index;
		const exprEngine = this.#host.exprEngine;

		const hasFilters = Object.keys(this.#filters).length > 0;

		if (!hasFilters) {
			rawRecords.forEach(record => {
				if (record?.m?._?.[NINE_TABLE.META.INDEX.FILTER]) {
					record.m._[NINE_TABLE.META.INDEX.FILTER][sheetIndex] = true;
				}
			});
			this.#sheet.invalidate();
			return;
		}

		// 💡 필터 규칙 빌드 (targetKey가 bind인지 expr 수식인지 판별)
		const filterRules = Object.entries(this.#filters).map(([targetKey, allowedValues]) => {
			const isExpr = targetKey.includes("data.") || targetKey.includes("host.") || targetKey.includes("rowItem.v");
			return {
				targetKey,
				isExpr,
				fieldIdx: !isExpr ? fields.indexOf(targetKey) : -1,
				allowedSet: new Set(allowedValues)
			};
		});

		rawRecords.forEach((record, recordIdx) => {
			if (!record) return;

			if (!record.m._[NINE_TABLE.META.INDEX.FILTER]) {
				record.m._[NINE_TABLE.META.INDEX.FILTER] = [];
			}

			let isPass = true;

			for (let i = 0; i < filterRules.length; i++) {
				const { targetKey, isExpr, fieldIdx, allowedSet } = filterRules[i];
				let val = undefined;

				if (isExpr && exprEngine) {
					val = exprEngine.evaluate(targetKey, record, recordIdx);
				} else if (fieldIdx >= 0 && record.v) {
					val = record.v[fieldIdx];
				}

				if (!allowedSet.has(val)) {
					isPass = false;
					break;
				}
			}

			record.m._[NINE_TABLE.META.INDEX.FILTER][sheetIndex] = isPass;
		});

		this.#sheet.invalidate();
	}
}

if (!customElements.get('nine-table-filter-panel')) {
	customElements.define("nine-table-filter-panel", NineTableFilterPanel);
}

if (!customElements.get('nine-table-filter-button')) {
	customElements.define("nine-table-filter-button", NineTableFilterButton);
}