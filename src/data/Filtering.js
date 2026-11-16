import { NINE_TABLE } from '@/core/constants.js';
import { trace } from "@nopeer";

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
		// 1. 고정 뼈대(검색창, 테이블 컨테이너, 푸터)는 최초 1회만 렌더링
		this.#renderer();

		this.#sheet = this.closest("nine-table-sheet");
		this.#host = this.getRootNode().host;

		// 2. 이벤트 리스너도 한 번만 등록
		const searchBox = this.querySelector(".search-box");
		searchBox.addEventListener("focusin", (e) => e.stopPropagation());
		searchBox.addEventListener("input", this.#onInput);

		this.querySelector("#chkSelectAll").addEventListener("change", this.#onSelectAll);
		this.querySelector("#btnOk").addEventListener("click", this.#onOk);

		this.#sheet.addEventListener("keydown", this.#onKeydown);
	}

	#renderer = () => {
		this.innerHTML = `
            <input type="text" class="search-box" placeholder="Search...">
            <div class="table-container"></div>
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

	#updateTableStructure() {
		const targetCols = this.#button.columns;
		const container = this.querySelector(".table-container");

		//trace.log(this.#host.isGroupBy, targetCols);

		if (targetCols.length <= 1) {
			container.innerHTML = `
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
		   `;
		} else {
			container.innerHTML = `
				<nine-table-simple class="filter-list" theme="simple">
					<table auto-fit-col="true">
						<colgroup>
							<col width="32" fixed="left" />
							<col width="180" />
							<col width="0" fixed="right"/>
						</colgroup>
						<tbody>
							<tr group-by="colnm">
								<td cell-type="checkbox" data-bind="CHK"></td>
								<td data-bind="colnm" cell-type="tree"></td>
							</tr>
							<tr>
								<td cell-type="checkbox" data-bind="CHK"></td>
								<td data-bind="DATA2" cell-type="tree" html="true"></td>
								<td data-bind="DATA"></td>
							</tr>
						</tbody>
					</table>
				</nine-table-simple>
		   `;
		}

		this.#nineTable = container.querySelector("nine-table-simple");
		setTimeout(() => {
			this.#view = this.#nineTable?.shadowRoot?.querySelector("nine-table-sheet");
		});
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

		//this.#drawNineTable();


		this.#updateTableStructure();

		//this.classList.add("active");
		this.classList.add("loading");

		setTimeout(() => {
			try {
				this.classList.add("active");

				this.#loadVirtualFilterItems();

				//if (this.#view.rowManager) {
				//this.#view.rowManager.scrollToDataRow(0);
				//}
				searchBox.focus({preventScroll: true});
			} catch (error) {
				trace.log(error);
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
		const allRecords = this.#host.data.getArray();
		const targetCols = this.#button?.columns || [];
		const fields = this.#host.fields.get() || [];
		const activeFilters = this.#sheet.filtering?.filters || {};
		const isGrouped = targetCols.length >= 2;

		// 1. 현재 컬럼(들)의 필터 키 목록 추출
		const currentFilterKeys = new Set(targetCols.map(col => col.expr || col.bind).filter(Boolean));

		// 2. 자기 자신(현재 컬럼)을 제외한 다른 컬럼들의 활성 필터 조건만 추출
		const otherFilters = Object.entries(activeFilters).filter(([key]) => !currentFilterKeys.has(key));

		// 3. 다른 필터 조건들을 파싱하여 검증 규칙 생성
		const filterRules = otherFilters.map(([targetKey, allowedValues]) => {
			const isExpr = targetKey.includes("data.") || targetKey.includes("host.") || targetKey.includes("rowItem.v");

			return {
				targetKey,
				isExpr,
				fieldIdx: !isExpr ? fields.indexOf(targetKey) : -1,
				allowedSet: new Set(allowedValues)
			};
		});

		// 4. 💡 자기 자신을 제외한 다른 필터 조건이 적용된 레코드들만 필터링
		const filteredRecords = [];
		for (let i = 0; i < allRecords.length; i++) {
			const record = allRecords[i];
			if (!record) continue;

			let isPass = true;
			if (filterRules.length > 0) {
				for (let j = 0; j < filterRules.length; j++) {
					const { targetKey, isExpr, fieldIdx, allowedSet } = filterRules[j];
					let val = undefined;

					if (isExpr) {
						val = this.#host.exprEngine.evaluate(targetKey, record, i);
					} else if (fieldIdx >= 0 && record.v) {
						val = record.v[fieldIdx];
					}

					if (!allowedSet.has(val)) {
						isPass = false;
						break;
					}
				}
			}

			if (isPass) {
				filteredRecords.push(record);
			}
		}

		let ds = [];

		if (!isGrouped) {
			const colInfo = targetCols[0] || {};
			const bindKey = colInfo.bind;
			const exprKey = colInfo.expr;
			const filterKey = bindKey || exprKey;
			const fieldIdx = bindKey ? fields.indexOf(bindKey) : -1;
			const activeSelectedVals = activeFilters[filterKey] || [];

			const uniqueMap = new Map();
			for (let i = 0; i < filteredRecords.length; i++) {
				const record = filteredRecords[i];
				if (!record) continue;

				let rawVal = undefined;
				if (fieldIdx >= 0 && record.v) {
					rawVal = record.v[fieldIdx];
				}/** else if (bindKey && bindKey.includes("data.")) {
					rawVal = this.#host.exprEngine.evaluate(bindKey, record, i);
				} else if (exprKey) {
					rawVal = this.#host.exprEngine.evaluate(exprKey, record, i);
				} */

				let displayVal = rawVal;
				if (exprKey) {
					displayVal = this.#host.exprEngine.evaluate(exprKey, record, i);
				} else if (colInfo.dataSource) {
					const ds = this.#host.exprEngine.evaluate(colInfo.dataSource);

					const found = ds.find(item => String(item[colInfo.keyName]) === String(rawVal));
					if (found) {
						displayVal = found[colInfo.valueName];
					}
				}

				if (displayVal !== undefined && displayVal !== null && !uniqueMap.has(displayVal)) {
					uniqueMap.set(displayVal, { v: rawVal, v2: displayVal });
				}
			}

			const uniqueList = [...uniqueMap.values()];
			uniqueList.sort((a, b) => {
				const valA = a.v2;
				const valB = b.v2;
				if (valA === valB) return 0;

				const isEmptyA = (valA === undefined || valA === null || valA === '');
				const isEmptyB = (valB === undefined || valB === null || valB === '');

				// 💡 빈값이 존재할 경우 무조건 위로 배치 (-1: A가 위, 1: B가 위)
				if (isEmptyA && isEmptyB) return 0;
				if (isEmptyA) return -1;
				if (isEmptyB) return 1;

				const numA = Number(valA);
				const numB = Number(valB);
				if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
				return String(valA).localeCompare(String(valB));
			});
			activeSelectedVals.sort((a, b) => { return a > b ? 1 : -1; });

			ds = uniqueList.map(o => ({
				DATA: o.v,
				DATA2: (o.v2 === "" || o.v2 === null || o.v2 === undefined) ? '<span class="empty-value">(empty)</span>' : o.v2,
				colnm: filterKey,
				CHK: activeSelectedVals.length === 0 || activeSelectedVals.nineBinarySearch(o.v || o.v2) >= 0 ? "Y" : "N"
			}));

		} else {
			targetCols.forEach((colInfo) => {
				const bindKey = colInfo.bind;
				const exprKey = colInfo.expr;
				const filterKey = bindKey || exprKey;
				const fieldIdx = bindKey ? fields.indexOf(bindKey) : -1;
				const activeSelectedVals = activeFilters[filterKey] || [];

				const uniqueMap = new Map();
				for (let i = 0; i < filteredRecords.length; i++) {
					const record = filteredRecords[i];
					if (!record) continue;

					let rawVal = undefined;
					if (fieldIdx >= 0 && record.v) {
						rawVal = record.v[fieldIdx];
					} else if (bindKey && bindKey.includes("data.")) {
						rawVal = this.#host.exprEngine.evaluate(bindKey, record, i);
					} else if (exprKey) {
						rawVal = this.#host.exprEngine.evaluate(exprKey, record, i);
					}

					let displayVal = rawVal;
					if (exprKey) {
						displayVal = this.#host.exprEngine.evaluate(exprKey, record, i);
					}

					if (displayVal !== undefined && displayVal !== null && !uniqueMap.has(displayVal)) {
						uniqueMap.set(displayVal, {
							raw: rawVal,
							display: (displayVal === "" || displayVal === null || displayVal === undefined) ? '<span class="empty-value">(empty)</span>' : displayVal
						});
					}
				}

				uniqueMap.forEach((valObj) => {
					ds.push({
						DATA2: valObj.display,
						DATA: valObj.raw,
						colnm: filterKey,
						CHK: activeSelectedVals.length === 0 || activeSelectedVals.nineBinarySearch(valObj.raw) >= 0 ? "Y" : "N"
					});
				});
			});
		}

		this.#nineTable.data.set(ds);

		const selectAllChk = this.querySelector("#chkSelectAll");
		if (selectAllChk) {
			selectAllChk.checked = ds.length > 0 && ds.every(item => item.CHK === "Y");
		}
	}

	#onOk = () => {
		this.#host.loading = true;

		const filterRecords = this.#view.view.getArray();
		const fields = this.#nineTable.fields.get();
		const targetCols = this.#button?.columns || [];
		const isGrouped = targetCols.length >= 2;

		const checkedRecords = filterRecords.filter(record => {
			const chk = record.v[fields.indexOf("CHK")];
			return (chk === "Y" || chk === true);
		});

		const filterParams = { ...(this.#sheet.filtering?.filters || {}) };

		if (!isGrouped) {
			const colInfo = targetCols[0];
			if (colInfo) {
				const filterKey = colInfo.expr || colInfo.bind;
				const fieldIdx = colInfo.expr ? fields.indexOf("DATA2") : fields.indexOf("DATA");
				const selectedVals = checkedRecords.map(r => r.v[fieldIdx]);

				if (selectedVals.length > 0) {
					filterParams[filterKey] = selectedVals;
				} else {
					delete filterParams[filterKey];
				}
			}
		} else {
			targetCols.forEach((colInfo) => {
				const filterKey = colInfo.expr || colInfo.bind;
				const fieldIdx = fields.indexOf(colInfo.bind);
				const selectedVals = checkedRecords.map(r => r.v[fieldIdx]);

				if (selectedVals.length > 0) {
					filterParams[filterKey] = [...new Set(selectedVals)];
				} else {
					delete filterParams[filterKey];
				}
			});
		}

		const totalCount = this.#nineTable.data.count();

		setTimeout(() => {
			try {
				if (totalCount === checkedRecords.length) {
					targetCols.forEach(colInfo => {
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

	#onKeydown = (e) => {
		switch (e.code) {
			case "Escape":
				this.close();
				break;

		}
	}

	#onInput = (e) => {
		const query = e.target.value.trim();

		/**
		if (query) {
			trace.log(this.#button.columns[0]);
			this.#view.filtering.apply(this.#button.columns[0], query, false);
		}
		else {
			this.#view.filtering.clear(this.#button.columns[0]);
		}
		return; */

		if (!query) {
			this.#view.filtering.clear();
		} else {

			const rawRecords = this.#nineTable.data.getArray();
			const fields = this.#nineTable.fields.get();
			const targetCols = this.#button.columns;
			const isGrouped = targetCols.length >= 2;

			const matchedValues = [];
			rawRecords.forEach(record => {
				if (!isGrouped) {
					const data2Idx = fields.indexOf("DATA2");
					const val = data2Idx >= 0 && record.v ? record.v[data2Idx] : "";

					if (String(val).toLowerCase().includes(query.toLowerCase())) {
						matchedValues.push(val);
					}

				} else {
					targetCols.forEach(col => {
						const idx = fields.indexOf(col.bind);
						const val = idx >= 0 && record.v ? record.v[idx] : "";
						if (String(val).toLowerCase().includes(query.toLowerCase())) {
							matchedValues.push(val);
						}
					});
				}
			});


			const filterField = isGrouped ? (targetCols[0].bind || 'COL_0') : "DATA2";
			this.#view.filtering.set({
				[filterField]: [...new Set(matchedValues)]
			});
		}
	};

	#onSelectAll = (e) => {
		const isChecked = e.target.checked;
		const rawRecords = this.#nineTable?.data?.getArray() || [];
		const fields = this.#nineTable.fields.get();
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
		const sourceTable = this.#sheet.source.table;

		const cols = [];
		const seen = new Set();

		if (sourceTable && cell) {
			const startCol = parseInt(cell.dataset.col || 0, 10);
			const colSpan = parseInt(cell.getAttribute('colspan') || cell.colSpan || 1, 10);
			const endCol = startCol + colSpan - 1;

			const rowIdx = parseInt(cell.closest('tr').dataset.subrow, 10) - 1;

			const tbodyTrs = Array.from(sourceTable.querySelectorAll('tbody tr')).filter(tr => !tr.hasAttribute('group-by'));

			for (let cIdx = startCol; cIdx <= endCol; cIdx++) {
				let targetCell = null;

				for (const tr of tbodyTrs) {

					const sRowIdx = tr.sectionRowIndex;
					const found = tr.querySelector(`[data-col="${cIdx}"]`);

					if (found) {
						if (sRowIdx === rowIdx || (sRowIdx === -1 && tbodyTrs.indexOf(tr) === rowIdx)) {
							targetCell = found;
							break;
						}

						if (!targetCell) {
							targetCell = found;
						}
					}
				}

				if (targetCell) {
					const bindKey = targetCell.dataset.bind;
					const exprKey = targetCell.dataset.expr;

					/**
					const dataSource = targetCell.getAttribute("data-source");
					if (dataSource && !exprKey) {
						this.#sheet.getRootNode().host.exprEngine.evaluate(dataSource);
						trace.log(targetCell);
					} */


					if (bindKey || exprKey) {
						const uniqueKey = `${bindKey || ''}_${exprKey || ''}`;
						if (!seen.has(uniqueKey)) {
							seen.add(uniqueKey);
							cols.push({
								bind: bindKey,
								expr: exprKey,
								col: cIdx,
								row: rowIdx,
								dataSource: targetCell.getAttribute("data-source"),
								keyName: targetCell.getAttribute("key-name"),
								valueName: targetCell.getAttribute("value-name"),
							});
						}
					}
				}
			}
		}

		//trace.log(cols)
		// 단일 컬럼 기준 처리 (필요에 따라 복수 컬럼 확장 가능)
		this.#columns = cols.length > 0 ? [cols[0]] : [];
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

		e.preventDefault();
		e.stopPropagation();

		const panel = this.#sheet.querySelector("nine-table-filter-panel");
		const cell = this.closest("th, td");
		const col = cell.dataset.col;

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
	#exprPredicate;

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
			this.#exprPredicate = null;
		}

		this.#isFiltering = Object.keys(this.#filters).length > 0;
		this.#applyFiltering();

		this.#sheet.querySelectorAll("nine-table-filter-button").forEach(btn => {
			btn.updateFilteredState();
		});
	}

	set = (oFilter) => {
		let jsonFilter = Array.isArray(oFilter)
			? Object.fromEntries(Object.keys(oFilter[0]).map(k => [k, [...new Set(oFilter.map(item => item[k]))]]))
			: oFilter;

		this.#filters = jsonFilter;
		this.#isFiltering = Object.keys(jsonFilter).length > 0 || !!this.#exprPredicate; // 💡 [수정]
		this.#sheet.toggleAttribute("filtering", this.#isFiltering);

		this.#applyFiltering();
	}

	#applyFiltering1() {
		const hostData = this.#host.data;
		const rawRecords = hostData.getArray();
		const fields = this.#host.fields.get();
		const sheetIndex = this.#sheet.index;

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
			//if (!record) return;

			if (!record.m._[NINE_TABLE.META.INDEX.FILTER]) {
				record.m._[NINE_TABLE.META.INDEX.FILTER] = [];
			}

			let isPass = true;

			for (let i = 0; i < filterRules.length; i++) {
				const { targetKey, isExpr, fieldIdx, allowedSet } = filterRules[i];
				let val = undefined;

				if (isExpr) {
					val = this.#host.exprEngine.evaluate(targetKey, record, recordIdx);
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

		this.#sheet.selection.clear();

		this.#sheet.invalidate();
	}

	apply = (arg1, arg2, caseSensitive = false) => {
		const rawRecords = this.#host.data.getArray();
		const fields = this.#host.fields.get();
		const exprEngine = this.#host.exprEngine;

		// 1. 필드명 없이 조건식 문자열을 통째로 넘긴 경우 (예: "data.REC1 === 50 || data.REC2 === 50")
		if (typeof arg1 === 'string' && arg2 === undefined && (arg1.includes('>') || arg1.includes('<') || arg1.includes('==') || arg1.includes('===') || arg1.includes('&&') || arg1.includes('||') || arg1.includes('data.'))) {
			this.#exprPredicate = arg1; // 💡 필터 객체에 섞지 않고 전용 필드에 저장

			this.#isFiltering = Object.keys(this.#filters).length > 0 || !!this.#exprPredicate;
			this.#sheet.toggleAttribute("filtering", this.#isFiltering);
			this.#applyFiltering();

			this.#sheet.querySelectorAll("nine-table-filter-button").forEach(btn => {
				btn.updateFilteredState();
			});
			return;
		}

		// 2. 객체 형태로 여러 필터 조건을 한 번에 넘긴 경우
		if (typeof arg1 === 'object' && arg1 !== null) {
			const newFilters = {};

			Object.entries(arg1).forEach(([fKey, qVal]) => {
				const fieldIdx = fields.indexOf(fKey);
				const isExpr = fKey && (fKey.includes("data.") || fKey.includes("host.") || fKey.includes("rowItem.v"));
				const matchedValues = [];

				rawRecords.forEach((record, index) => {
					if (!record) return;
					let val = undefined;

					if (isExpr && exprEngine) {
						val = exprEngine.evaluate(fKey, record, index);
					} else if (fieldIdx >= 0 && record.v) {
						val = record.v[fieldIdx];
					} else if (fKey) {
						val = record[fKey];
					}

					if (val !== undefined && val !== null) {
						const strVal = String(val).trim();
						const isMatch = caseSensitive
							? strVal.includes(String(qVal).trim())
							: strVal.toLowerCase().includes(String(qVal).trim().toLowerCase());

						if (isMatch) {
							matchedValues.push(val);
						}
					}
				});

				newFilters[fKey] = [...new Set(matchedValues)];
			});

			this.set({
				...(this.#filters || {}),
				...newFilters
			});
			return;
		}

		// 3. 기존 방식: 단일 fieldKey와 query를 넘긴 경우
		const fieldKey = arg1;
		const query = arg2;
		if (!fieldKey) return;

		const trimmedQuery = String(query || "").trim();
		const fieldIdx = fields.indexOf(fieldKey);
		const isExpr = fieldKey && (fieldKey.includes("data.") || fieldKey.includes("host.") || fieldKey.includes("rowItem.v"));
		const matchedValues = [];

		rawRecords.forEach((record, index) => {
			if (!record) return;
			let val = undefined;

			if (isExpr && exprEngine) {
				val = exprEngine.evaluate(fieldKey, record, index);
			} else if (fieldIdx >= 0 && record.v) {
				val = record.v[fieldIdx];
			} else if (fieldKey) {
				val = record[fieldKey];
			}

			if (val !== undefined && val !== null) {
				const strVal = String(val).trim();
				const isMatch = caseSensitive
					? strVal.includes(trimmedQuery)
					: strVal.toLowerCase().includes(trimmedQuery.toLowerCase());

				if (isMatch) {
					matchedValues.push(val);
				}
			}
		});

		this.#filters = {
			...this.#filters,
			[fieldKey]: [...new Set(matchedValues)]
		};

		this.#isFiltering = Object.keys(this.#filters).length > 0 || !!this.#exprPredicate;
		this.#sheet.toggleAttribute("filtering", this.#isFiltering);
		this.#applyFiltering();

		this.#sheet.querySelectorAll("nine-table-filter-button").forEach(btn => {
			btn.updateFilteredState();
		});
	}

	#applyFiltering() {
		const hostData = this.#host.data;
		const rawRecords = hostData.getArray();
		const fields = this.#host.fields.get();
		const exprEngine = this.#host.exprEngine;
		const sheetIndex = this.#sheet.index;

		const hasFilters = Object.keys(this.#filters).length > 0 || !!this.#exprPredicate;

		if (!hasFilters) {
			rawRecords.forEach(record => {
				if (record?.m?._?.[NINE_TABLE.META.INDEX.FILTER]) {
					record.m._[NINE_TABLE.META.INDEX.FILTER][sheetIndex] = true;
				}
			});
			this.#sheet.invalidate();
			return;
		}

		// 💡 이제 this.#filters에는 오직 배열 형태의 컬럼 허용 값들만 존재하므로 안전함
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
			if (!record.m._[NINE_TABLE.META.INDEX.FILTER]) {
				record.m._[NINE_TABLE.META.INDEX.FILTER] = [];
			}

			let isPass = true;

			// 💡 1. 커스텀 조건식(#exprPredicate)이 있다면 먼저 평가
			if (this.#exprPredicate && exprEngine) {
				try {
					isPass = !!exprEngine.evaluate(this.#exprPredicate, record, recordIdx);
				} catch (e) {
					isPass = false;
				}
			}

			// 💡 2. 통과한 경우에만 일반 필터 규칙 검증 수행
			if (isPass && filterRules.length > 0) {
				for (let i = 0; i < filterRules.length; i++) {
					const { targetKey, isExpr, fieldIdx, allowedSet } = filterRules[i];
					let val = undefined;

					if (isExpr) {
						val = exprEngine.evaluate(targetKey, record, recordIdx);
					} else if (fieldIdx >= 0 && record.v) {
						val = record.v[fieldIdx];
					}

					if (!allowedSet.has(val)) {
						isPass = false;
						break;
					}
				}
			}

			record.m._[NINE_TABLE.META.INDEX.FILTER][sheetIndex] = isPass;
		});

		this.#sheet.selection.clear();
		this.#sheet.invalidate();
	}

	// 💡 부등호 및 조건 매칭을 판별하는 헬퍼 메서드
	#checkMatch = (val, query, caseSensitive) => {
		const queryStr = String(query).trim();

		// 부등호 연산자 패턴 매칭 (>=, <=, >, <, ==, !=)
		const opMatch = queryStr.match(/^([><=!]=?|[><])\s*(.+)$/);

		if (opMatch) {
			const op = opMatch[1];
			const rawTarget = opMatch[2].trim();

			const numVal = Number(val);
			const numTarget = Number(rawTarget);
			const isNumeric = !isNaN(numVal) && !isNaN(numTarget);

			if (isNumeric) {
				if (op === '>') return numVal > numTarget;
				if (op === '>=') return numVal >= numTarget;
				if (op === '<') return numVal < numTarget;
				if (op === '<=') return numVal <= numTarget;
				if (op === '==' || op === '=') return numVal === numTarget;
				if (op === '!=' || op === '<>') return numVal !== numTarget;
			} else {
				// 숫자가 아닌 경우 문자열 사전순 비교
				const strVal = String(val);
				if (op === '>') return strVal > rawTarget;
				if (op === '>=') return strVal >= rawTarget;
				if (op === '<') return strVal < rawTarget;
				if (op === '<=') return strVal <= rawTarget;
				if (op === '==' || op === '=') return strVal === rawTarget;
				if (op === '!=' || op === '<>') return strVal !== rawTarget;
			}
		}

		// 부등호가 없는 일반 검색인 경우 기존처럼 포함(includes) 여부 검사
		const strVal = String(val).trim();
		return caseSensitive
			? strVal.includes(queryStr)
			: strVal.toLowerCase().includes(queryStr.toLowerCase());
	}
}

if (!customElements.get('nine-table-filter-panel')) {
	customElements.define("nine-table-filter-panel", NineTableFilterPanel);
}

if (!customElements.get('nine-table-filter-button')) {
	customElements.define("nine-table-filter-button", NineTableFilterButton);
}