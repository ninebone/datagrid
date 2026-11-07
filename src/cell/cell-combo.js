import { trace } from "@nopeer";
import { EditableCellElement } from "./core/CellElement.js";
import "./cell-combo-panel.js";

export class CellCombo extends EditableCellElement {
	#target;
	#dataSource = [];
	#panel;

	constructor() {
		super();
	}

	connectedCallback() {

		super.connectedCallback();

		this.#init();
	}

	rerenderer = () => {
		this.#initData();
		this.refresh();
	};


	refresh = () => {
		super.refresh();

		this.#target.textContent = this.#getDisplayText() || "Select";
		this.#validateInput();
	};

	#getDisplayText = () => {
		if (!this.value || !Array.isArray(this.#dataSource)) return "";

		if (this.multi) {
			const keys = String(this.value).split(this.multiSeparator);
			return this.#dataSource
				.filter(m => keys.includes(String(m[this.keyName])))
				.map(m => m[this.valueName])
				.join(this.multiSeparator);
		} else {
			const found = this.#dataSource.find(m => String(m[this.keyName]) === String(this.value));
			return found ? found[this.valueName] : this.value;
		}
	}

	#validateInput = () => {
		if (!super.cell) return;
		super.cell.classList.remove("invalid");

		if (this.value === null || this.value === undefined || this.value === "" || !Array.isArray(this.#dataSource)) {
			return;
		}

		const list = this.multi ? String(this.value).split(this.multiSeparator) : [this.value];
		for (const v of list) {
			const idx = this.#dataSource.findIndex(m => String(v) === String(m[this.keyName]));
			if (idx < 0) {
				super.cell.classList.add("invalid");
				break;
			}
		}
	};

	#init = () => {

		this.#renderer();

		this.#initData();
		this.#initEvent();
	}

	#initData = () => {
		//if (!this.sheet || !this.cell) return;

		const dataSource = this.cell.getAttribute("data-source");
		if (dataSource) {
			this.#dataSource = super.getExprValue(dataSource, super.tr.data, super.tr.dataset.row);
		}
	}

	#renderer = () => {
		this.innerHTML = `
            <button class="btn1" type="button" tabindex="-1">Select</button>
            <button class="btn2" type="button" tabindex="-1"></button>
        `;

		this.#target = this.querySelector(".btn1");
	};

	#initEvent = () => {
		this.querySelectorAll("button").forEach($el => {
			$el.addEventListener("click", (e) => {
				e.stopPropagation();
				this.#togglePanel();
			});
		});


		this.cell.addEventListener('keydown', (e) => {
			if (["Space"].includes(e.code)) {
				this.#togglePanel();
			}
		});
	}

	#togglePanel = () => {

		if (!this.#panel) {
			this.#panel = this.sheet.querySelector("cell-combo-panel");
			if (!this.#panel) {
				this.#panel = document.createElement("cell-combo-panel");
				this.sheet.appendChild(this.#panel);
			}
		}

		//if (this.#panel.isOpen && this.#panel.targetCell === this) {
		if (this.#panel.classList.contains("active") && this.#panel.targetCell === this) {
			this.#panel.close();
		} else {
			this.#panel.open(this, this.#dataSource, this.keyName, this.valueName, this.multi, this.multiSeparator);
		}
	}

	get dataSource() {
		return this.#dataSource;
	}
	get keyName() {
		return this.cell.getAttribute("key-name") || "k";
	}
	get valueName() {
		return this.cell.getAttribute("value-name") || "v";
	}
	get multi() {
		return this.cell.getAttribute('multi') === "true";
	}
	get multiSeparator() {
		return this.cell.getAttribute("multi-separator") || ",";
	}
	get items() {
		return this.cell.getAttribute("items")?.split(",").map(s => s.trim()) || [];
	}
	get separator() {
		return this.multiSeparator;
	}
}

if (!customElements.get('cell-combo')) {
	customElements.define("cell-combo", CellCombo);
}