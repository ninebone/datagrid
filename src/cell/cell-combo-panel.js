import { trace } from "@nopeer";
import {NINE_TABLE} from "@";

export class CellComboPanel extends HTMLElement {
	#parent;
	#keyName;
	#valueName;
	#isOpen = false;

	#grd;
	#sheet;
	#separator;

	constructor() {
		super();
	}

	connectedCallback() {
		this.#renderer();

		this.#grd = this.querySelector("nine-table-simple");
		setTimeout(() => {
			this.#sheet = this.#grd.shadowRoot.querySelector("nine-table-sheet");
			this.#initEvents();
		})
	}

	#initData = (dataSource, keyName, valueName, multi) => {

		const grd = this.querySelector("nine-table-simple");
		if (!grd || !dataSource || dataSource.length === 0) return;

		const itemsAttr = this.#parent.closest("th,td").getAttribute("items");
		let fieldKeys = [];

		if (itemsAttr) {
			fieldKeys = itemsAttr.split(",").map(s => s.trim());
		} else {
			fieldKeys = [valueName].filter(Boolean);
		}

		const activeColumnCount = fieldKeys.length;

		//grd.shadowRoot.querySelector(".ng-container-left").style.display = multi ? '' : 'none';

		const sheet = grd.shadowRoot.querySelector("nine-table-sheet");

		sheet.source.table.querySelectorAll('colgroup col, tbody td').forEach(($el, idx) => {
			const col = parseInt($el.dataset.col, 10);
			if (col >= 2) {
				$el.style.display = (col - 2 >= activeColumnCount) ? 'none' : '';
			}
		});

		grd.shadowRoot.querySelectorAll('table colgroup col').forEach(($el, idx) => {
			const col = parseInt($el.dataset.col, 10);
			if (col >= 2) {
				$el.style.display = (col - 2 >= activeColumnCount) ? 'none' : '';
			}
		});


		const formattedData = dataSource.map(item => {
			const row = {
				CHK: "N",
				k: keyName && item[keyName] !== undefined ? item[keyName] : (item[0] !== undefined ? item[0] : "")
			};

			fieldKeys.forEach((key, idx) => {
				row[`tmp${idx + 1}`] = item[key] !== undefined ? item[key] : (item[idx] !== undefined ? item[idx] : "");
			});
			return row;
		});

		grd.addEventListener(NINE_TABLE.EVENT.ROW_ADDED, () => {
			setTimeout(() => {

				this.style.opacity = "";
				this.classList.add("active");

				grd.shadowRoot.querySelectorAll('colgroup col').forEach(($el, idx) => {
					const col = parseInt($el.dataset.col, 10);
					if (col >= 2 && $el.style.display !== "none") {
						sheet.col.autoFit(col);
					}
				});

				const fields = this.#grd.fields.get();

				if (multi) {
					const selectedKeys = this.#parent.value ? String(this.#parent.value).split(this.#separator).map(s => s.trim()) : [];
					const kIndex = fields.indexOf("k");
					const chkIndex = fields.indexOf("CHK");

					this.#grd.data.getArray().forEach(record => {
						record.v[chkIndex] = (selectedKeys.includes(String(record.v[kIndex]))) ? "Y" : "N";
					});

					const index = this.#sheet.view.getArray().findIndex((record, idx) => {
						return record.v[kIndex] === selectedKeys[0];
					});

					this.#selectRow(index);
				} else {
					const currentValue = this.#parent.value;
					const kIndex = fields.indexOf("k");
					const index = this.#sheet.view.getArray().findIndex((record, idx) => {
						return record.v[kIndex] === currentValue;
					});

					this.#selectRow(index);
				}
			})
		}, {once: true});

		if (multi && this.#parent.value) {
			/**
			const selectedKeys = String(this.#parent.value).split(separator || ",");
			grd.data.getValidData().forEach(m => {
				if (selectedKeys.includes(String(m.v[1]))) {
					m.v[0] = "Y";
				}
			});
			grd.refreshData();
				*/
		}

		if (formattedData.length * this.#sheet.template.height >= this.offsetHeight) {
			this.classList.add("expand");
		} else {
			this.classList.remove("expand");
		}

		grd.data.set(formattedData);


	};

	#isPanelBelow = ($btn) => {
		const $sheet = $btn.closest(".ng-sheet-body");

		const btnRect = $btn.getBoundingClientRect();
		const sheetRect = $sheet.getBoundingClientRect();
		const spaceBelow = sheetRect.bottom - btnRect.bottom;
		const spaceAbove = btnRect.top - sheetRect.top;

		return spaceBelow >= spaceAbove;
	};

	#calculatePanelHeight = ($btn, isDropDown = 0) => {
		const $sheet = $btn.closest(".ng-sheet-body");

		const btnRect = $btn.getBoundingClientRect();
		const sheetRect = $sheet.getBoundingClientRect();

		let h = (isDropDown ? (sheetRect.bottom - btnRect.bottom) : (btnRect.top - sheetRect.top)) - 5;

		return h;
	}

	#calculatePanelLeft = ($btn) => {

		const $cell = $btn.closest("th,td");
		const $sheet = $cell.closest(".ng-sheet-body");


		const cellRect = $cell.getBoundingClientRect();
		const sheetRect = $sheet.getBoundingClientRect();

		let left = cellRect.left - sheetRect.left;

		const panelWidth = this.offsetWidth;
		if (left + panelWidth > sheetRect.width) {
			left = Math.max(0, sheetRect.width - panelWidth - 2);
		}

		if (left < 0) {
			left = 5;
		}

		return left;
	};

	open = (parent, dataSource, keyName, valueName, multi, separator) => {
		this.#parent = parent;
		this.#keyName = keyName;
		this.#valueName = valueName;
		this.#isOpen = true;

		this.#separator = separator;

		this.classList.add("active");
		this.style.opacity = "0";

		setTimeout(() => {
			const grd = this.querySelector("nine-table-simple");
			if (!grd || !dataSource) return;

			this.querySelector(".search-input").value = "";
			this.querySelector("#chkAll").checked = true;

			const sheet = parent.closest(".ng-sheet-body");
			const btnRect = parent.getBoundingClientRect();
			const sheetRect = sheet.getBoundingClientRect();

			const isDropDown = this.#isPanelBelow(parent);
			const h = this.#calculatePanelHeight(parent, isDropDown);
			const l = this.#calculatePanelLeft(parent);
			const t = isDropDown ? (btnRect.bottom - sheetRect.top) : (btnRect.top - sheetRect.top - h);

			this.style.height = `${h}px`;
			this.style.left = `${l}px`;
			this.style.top = `${t}px`;
			//this.style.opacity = "";

			if (multi) {
				this.classList.add("multi");
				this.#grd.classList.add("multi");
			} else {
				this.classList.remove("multi");
				this.#grd.classList.remove("multi");
			}

			this.#initData(dataSource, keyName, valueName, multi);
		}, 100);
	}

	close = () => {
		this.classList.remove("active");
		this.#isOpen = false;
		if (this.#parent && this.#parent.cell) {
			this.#parent.cell.focus();
		}
	}





	#onClick = (e) => {
		const $cell = e.target.closest("th,td");
		if (this.#grd.classList.contains("multi")) {
			const index = parseInt($cell?.dataset.index, 10);
			this.#checkRow(index);
		}
		else {
			const col = parseInt($cell?.dataset.col, 10);

			if (col >= 2) {
				this.#returnRow();
			}
		}
	}

	#onKeydown_input = (e) => {
		switch (e.code) {
			case "Enter":
			case "ArrowDown":
				const index = this.#grd.row.at();
				if (index < 0) {
					this.#selectRow(0)
				} else {
					this.#selectRow(index)
				}
				break;
			case "Tab":
				this.#selectRow(this.#grd.row.at());
				break;
		}
	};

	#onKeydown = (e) => {
		let index;
		switch (e.code) {
			case "Escape":
				this.close();
				break;
			case "Enter":
				if (this.classList.contains("multi")) {
					this.#onOk();
				} else {
					this.#returnRow();
				}
				break;
			case "Tab":
				if (this.classList.contains("expand")) {
					e.preventDefault();
					this.querySelector("input[type='text']").focus();
				}
				break;
			case "ArrowDown":
				index = this.#grd.row.at();
				if (index < 0) {
					this.#selectRow(0)
				}
				break;
			case "Space":
				e.preventDefault();
				if (["TH","TD"].includes(e.target.tagName)) {
					this.#checkRow(this.#grd.row.at());
				}

				break;
		}
	}

	#onOk = () => {

		const fields = this.#grd.fields.get();
		const kIndex = fields.indexOf("k");
		const chkIndex = fields.indexOf("CHK");

		const arr = [];
		this.#sheet.view.getArray().forEach(o => {
			if (o.v[chkIndex] === "Y") {
				arr.push(o.v[kIndex]);
			}
		});

		this.#parent.value = arr.join(this.#separator);

		this.#parent.sheet.rowManager.refresh(true);
		this.close();
	}

	#returnRow = () => {
		const index = this.#grd.row.at();

		if (index >= 0) {
			const record = this.#sheet.view.get(index);

			this.#parent.value = record.k;
			this.#parent.sheet.rowManager.refresh(true);
			this.close();
		}
	}

	#checkRow = (index) => {

		if (this.#grd.classList.contains("multi") && index >= 0) {
			const record = this.#sheet.view.get(index);

			this.#grd.data.setValue(record.m._[NINE_TABLE.META.INDEX.ROWID], "CHK", record.CHK === "Y" ? "N" : "Y");

			this.#grd.refresh();
		}
	};

	#selectRow = (index) => {
		if (index !== -1) {
			this.#sheet.row.focus(index, () => {
				setTimeout(() => {
					const cell = this.#sheet.querySelector(`tr[data-index="${index}"] td[data-col="2"]`);
					this.#sheet.navigation.currentCell = cell;
					cell.focus();
					this.#sheet.invalidate();
				});
			});
		} else {
			this.#sheet.row.focus(-1, () => {
			});

			setTimeout(() => {
				this.#sheet.selection.clear();

				this.#sheet.navigation.currentCell = this.#sheet.querySelector(`tr[data-index="0"] td[data-col="2"]`);
				this.#sheet.focus();
				this.#sheet.invalidate();
			});
		}
	}

	#onSelectAll = (e) => {

		const chkIdx = this.#grd.fields.get().indexOf("CHK");

		this.#grd.data.getArray().forEach(record => {
			record.v[chkIdx] = e.target.checked ? "Y" : "N";
		});

		this.#sheet.invalidate();
	};


	#onInput = (e) => {
		const query = e.target.value.toLowerCase().trim();

		if (!query) {
			this.#sheet.filtering.clear();
		} else {
			const rawRecords = this.#grd.data.getArray();
			const fields = this.#grd.fields.get();

			const colnm = "tmp1";
			const data2Idx = fields.indexOf(colnm);

			const matchedValues = [];
			rawRecords.forEach(record => {
				const val = data2Idx >= 0 && record.v ? record.v[data2Idx] : "";
				const textVal = String(val).replace(/<[^>]*>?/gm, '').toLowerCase();

				if (textVal.includes(query)) {
					matchedValues.push(val);
				}
			});

			this.#sheet.filtering.set({
				[colnm]: [...new Set(matchedValues)]
			});
		}
	}

	get isOpen() {
		return this.#isOpen;
	}

	get targetCell() {
		return this.#parent;
	}

	#initEvents = () => {
		this.querySelector(".search-input").addEventListener("input", this.#onInput);
		this.querySelector(".search-input").addEventListener("keydown", this.#onKeydown_input);
		this.querySelector("#btnOk").addEventListener("click", this.#onOk);
		this.querySelector("#chkAll").addEventListener("change", this.#onSelectAll);

		this.#sheet.addEventListener("keydown", this.#onKeydown);
		this.#sheet.addEventListener("click", this.#onClick);

		document.addEventListener("mousedown", (e) => {
			const path = e.composedPath ? e.composedPath() : [];

			if (path.includes(this)) {
				return;
			}
			this.close();
		});
	}

	#renderer = () => {
		this.innerHTML = `
            <input type="text" class="search-input" placeholder="Search..." />
            
            <nine-table-simple class="combo-list" theme="simple">
                <table auto-fit-col="true">
                    <colgroup>
                        <col width="30" fixed="left" />
                        <col width="100" />
                        <col width="100" />
                        <col width="100" />
                        <col width="100" />
                        <col width="100" />
                        <col width="100" />
                        <col width="100" />
                        <col width="100" />
                        <col width="100" />
                        <col width="100" />
                        <col width="0" />
                    </colgroup>
                    <tbody>
                        <tr>
                            <td cell-type="checkbox" data-bind="CHK"></td>
                            <td data-bind="tmp1" />
                            <td data-bind="tmp2" />
                            <td data-bind="tmp3" />
                            <td data-bind="tmp4" />
                            <td data-bind="tmp5" />
                            <td data-bind="tmp6" />
                            <td data-bind="tmp7" />
                            <td data-bind="tmp8" />
                            <td data-bind="tmp9" />
                            <td data-bind="tmp10" />
                            <td data-bind="k" />
                        </tr>
                    </tbody>
                </table>
            </nine-table-simple>
            
            <div class="footer">
                <label for="chkAll"><input id="chkAll" type="checkbox" checked><span>Select All</span></label>
                <button id="btnOk">OK</button>
            </div>
        `;
	};
}

if (!customElements.get('cell-combo-panel')) {
	customElements.define("cell-combo-panel", CellComboPanel);
}