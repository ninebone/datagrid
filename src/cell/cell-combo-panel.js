import { trace } from "@nopeer";
import { NINE_TABLE } from "@";

export class CellComboPanel extends HTMLElement {
	#EXPAND_ROW_COUNT = 10;

	#parent;
	#grd;
	#sheet;


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

	#initData = (formattedData) => {

		if (!this.#grd || !this.#parent.dataSource || this.#parent.dataSource.length === 0) return;

		const activeColumnCount = this.#parent.items.length || 1;

		this.#sheet.source.table.querySelectorAll('colgroup col, tbody td').forEach(($el, idx) => {
			const col = parseInt($el.dataset.col, 10);
			if (col >= 2) {
				$el.style.display = (col - 2 >= activeColumnCount) ? 'none' : '';
			}
		});

		this.#sheet.querySelectorAll('table colgroup col').forEach(($el, idx) => {
			const col = parseInt($el.dataset.col, 10);
			if (col >= 2) {
				$el.style.display = (col - 2 >= activeColumnCount) ? 'none' : '';
			}
		});


		this.#grd.addEventListener(NINE_TABLE.EVENT.ROW_ADDED, () => {
			setTimeout(() => {

				this.style.opacity = "";
				this.classList.add("active");

				this.#sheet.querySelectorAll('colgroup col').forEach(($el, idx) => {
					const col = parseInt($el.dataset.col, 10);
					if (col >= 2 && $el.style.display !== "none") {
						this.#sheet.col.autoFit(col);
					}
				});

				const fields = this.#grd.fields.get();

				if (this.#parent.multi) {
					const selectedKeys = this.#parent.value ? String(this.#parent.value).split(this.#parent.separator).map(s => s.trim()) : [];
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

		if (formattedData.length > this.#EXPAND_ROW_COUNT) {
			this.classList.add("expand");
		} else {
			this.classList.remove("expand");
		}

		this.#grd.data.set(formattedData);
	};

	#isPanelBelow = ($btn) => {
		const $sheet = $btn.closest(".ng-sheet-body");

		const btnRect = $btn.getBoundingClientRect();
		const sheetRect = $sheet.getBoundingClientRect();
		const spaceBelow = sheetRect.bottom - btnRect.bottom;
		const spaceAbove = btnRect.top - sheetRect.top;

		return spaceBelow >= spaceAbove;
	};

	#calculatePanelHeight = ($btn, isDropDown, rows) => {
		const $sheet = $btn.closest(".ng-sheet-body");

		const btnRect = $btn.getBoundingClientRect();
		const sheetRect = $sheet.getBoundingClientRect();

		const searchInputHeight = 32;
		const h1 = (isDropDown ? (sheetRect.bottom - btnRect.bottom) : (btnRect.top - sheetRect.top)) - 5;
		const h2 = (rows * this.#sheet.template.height) + (rows > this.#EXPAND_ROW_COUNT ? searchInputHeight : 0) + 2;

		return Math.min(h1, h2);
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

	open = (parent) => {
		this.#parent = parent;

		this.classList.add("active");
		this.style.opacity = "0";

		let items = this.#parent.items;
		if (items.length === 0) {
			items.push(this.#parent.valueName);
		}

		const formattedData = this.#parent.dataSource.map(item => {
			const row = {
				CHK: "N",
				k: this.#parent.keyName && item[this.#parent.keyName] !== undefined ? item[this.#parent.keyName] : (item[0] !== undefined ? item[0] : "")
			};

			items.forEach((key, idx) => {
				row[`tmp${idx + 1}`] = item[key] !== undefined ? item[key] : (item[idx] !== undefined ? item[idx] : "");
			});
			return row;
		});

		setTimeout(() => {

			if (!this.#grd || !this.#parent.dataSource) return;

			this.querySelector(".search-input").value = "";
			this.querySelector("#chkAll").checked = true;

			const sheet = parent.closest(".ng-sheet-body");
			const btnRect = parent.getBoundingClientRect();
			const sheetRect = sheet.getBoundingClientRect();

			const isDropDown = this.#isPanelBelow(parent);
			const h = this.#calculatePanelHeight(parent, isDropDown, formattedData.length);
			const l = this.#calculatePanelLeft(parent);
			const t = isDropDown ? (btnRect.bottom - sheetRect.top) : (btnRect.top - sheetRect.top - h);

			this.style.height = `${h}px`;
			this.style.left = `${l}px`;
			this.style.top = `${t}px`;
			//this.style.opacity = "";

			if (this.#parent.multi) {
				this.classList.add("multi");
				this.#grd.classList.add("multi");
			} else {
				this.classList.remove("multi");
				this.#grd.classList.remove("multi");
			}

			this.#initData(formattedData);
		}, 100);
	}

	close = () => {
		this.classList.remove("active");
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

		this.#parent.value = arr.join(this.#parent.separator);

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

			let matchedValues = [];
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