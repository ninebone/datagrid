import { trace } from "@nopeer";

export class CellComboPanel extends HTMLElement {
	#parent;
	#keyName;
	#valueName;
	#isOpen = false;

	constructor() {
		super();
	}

	connectedCallback() {
		this.#renderer();
		this.#initEvents();
	}

	#initData = (dataSource, keyName, valueName, multi, separator) => {
		const grd = this.querySelector("nine-table-simple");
		if (!grd || !dataSource || dataSource.length === 0) return;

		const itemsAttr = this.#parent.getAttribute("items");
		let fieldKeys = [];

		if (itemsAttr) {
			fieldKeys = itemsAttr.split(",").map(s => s.trim());
		} else {
			fieldKeys = [valueName].filter(Boolean);
		}

		const activeColumnCount = fieldKeys.length;

		grd.shadowRoot.querySelector(".ng-container-left").style.display = multi ? '' : 'none';

		grd.shadowRoot.querySelectorAll('table colgroup col, tbody td').forEach(($el, idx) => {

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

		grd.data.set(formattedData);

		if (multi && this.#parent.value) {
			const selectedKeys = String(this.#parent.value).split(separator || ",");
			grd.data.getValidData().forEach(m => {
				if (selectedKeys.includes(String(m.v[1]))) {
					m.v[0] = "Y";
				}
			});
			grd.refreshData();
		}
	};

	open = (parent, dataSource, keyName, valueName, multi, separator) => {
		this.#parent = parent;
		this.#keyName = keyName;
		this.#valueName = valueName;
		this.#isOpen = true;

		this.classList.add("active");

		const grd = this.querySelector("nine-table-simple");
		if (!grd || !dataSource) return;

		this.querySelector(".search-input").value = "";
		this.querySelector("#chkAll").checked = true;

		if (dataSource.length > 10) {
			this.classList.add("expand");
		} else {
			this.classList.remove("expand");
		}

		if (multi) {
			this.classList.add("multi");
		} else {
			this.classList.remove("multi");
		}

		const sheet = parent.closest("nine-table-sheet");
		const btnEl = parent.querySelector(".btn1");
		if (!btnEl || !sheet) return;

		const btnRect = btnEl.getBoundingClientRect();
		const sheetRect = sheet.getBoundingClientRect();

		let left = btnRect.left - sheetRect.left;
		let top = btnRect.bottom - sheetRect.top + 2;

		const panelWidth = this.offsetWidth || 250;
		const panelHeight = this.offsetHeight || 250;
		if (left + panelWidth > sheetRect.width) {
			left = Math.max(0, sheetRect.width - panelWidth - 5);
		}

		if (left < 0) {
			left = 5;
		}

		if (top + panelHeight > sheetRect.height) {
			const upwardTop = (btnRect.top - sheetRect.top) - panelHeight - 2;
			if (upwardTop >= 0) {
				top = upwardTop;
			} else {
				top = Math.max(0, sheetRect.height - panelHeight - 5);
			}
		}

		this.style.left = `${left}px`;
		this.style.top = `${top}px`;

		setTimeout(() => {

			this.#initData(dataSource, keyName, valueName, multi, separator);

			const viewContainer = grd.shadowRoot.querySelector(".ng-container-body table tbody.body");

			if (!viewContainer.__hasClickEvent) {

				viewContainer.addEventListener("mousedown", (e) => {

					const tr = e.target.closest("tr");
					if (!tr) return;

					if (!multi) {
						this.#onClickRow(e);
					}
				});
				viewContainer.__hasClickEvent = true;
			}
		}, 100);
	}

	close = () => {
		this.classList.remove("active");
		this.#isOpen = false;
		if (this.#parent && this.#parent.cell) {
			this.#parent.cell.focus();
		}
	}

	#onClickRow = (e) => {

		const sheet = e.target.closest("nine-table-sheet");
		const tr = e.target.closest("tr");

		const rowIndex = parseInt(tr.dataset.row, 10);
		const record = sheet.view.get(rowIndex);

		this.#parent.value = record.k;

		this.#parent.sheet.rowManager.refresh(true);

		this.close();
	}

	#onOk = () => {
		const grd = this.querySelector("nine-table-simple");
		const data = grd.data.getValidData();

		const selectedKeys = [];
		data.forEach(o => {
			if (o.v[0] === "Y") {
				selectedKeys.push(o.v[1]);
			}
		});

		this.#parent.value = selectedKeys.join(this.#parent.getAttribute("multi-separator") || ",");
		this.#parent.sheet.rowManager.refresh(true);

		this.close();
	}

	#onSelectAll = (e) => {
		const grd = this.querySelector("nine-table-simple");
		const isChecked = e.target.checked ? "Y" : "N";
		grd.data.getValidData().forEach(m => { m.v[0] = isChecked; });
		grd.refreshData();
	}

	#onInput = (e) => {
		const keyword = e.target.value.toLowerCase();
		const grd = this.querySelector("nine-table-simple");

		grd.data.getValidDataNF().forEach(m => {
			const match = Object.values(m.v).some(val =>
				val !== null && val !== undefined && String(val).toLowerCase().includes(keyword)
			);
			m.__ng.filtered = !match;
		});

		grd.data.resetRecords();
		grd.dataManager.viewRecords.reset();
	}

	get isOpen() {
		return this.#isOpen;
	}

	get targetCell() {
		return this.#parent;
	}

	#initEvents = () => {
		this.querySelector(".search-input").addEventListener("input", this.#onInput);
		this.querySelector("#btnOk").addEventListener("click", this.#onOk);
		this.querySelector("#chkAll").addEventListener("change", this.#onSelectAll);

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
            <div class="head">
                <input type="text" class="search-input" placeholder="Search..." />
            </div>
            
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
                <div>
                    <input id="chkAll" type="checkbox" checked>
                    <label for="chkAll">Select All</label>
                </div>
                <button id="btnOk">OK</button>
            </div>
        `;
	};
}

if (!customElements.get('cell-combo-panel')) {
	customElements.define("cell-combo-panel", CellComboPanel);
}