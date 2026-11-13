import { trace } from "@nopeer";
import { CellElement } from "./core/CellElement.js";
import {NINE_TABLE} from "@";
import {CellTree} from "@/cell/cell-tree.js";

class CellRowIndicator extends CellElement {
	#mainTarget;
	#subTarget;
	#statusTarget;

	constructor() {
		super();
	}

	connectedCallback() {
		this.#renderer();
		super.connectedCallback();

		if (this.cell) {
			this.cell.removeAttribute("tabindex");
			this.cell.dataset.bind = "rowState";
		}

		this.#mainTarget = this.querySelector(".ng-row-main");
		this.#subTarget = this.querySelector(".ng-row-sub");
		this.#statusTarget = this.querySelector(".row-status");
	}

	#renderer = () => {
		this.innerHTML = `
			<span class="ng-row-main"></span>
            <span class="ng-row-sub"></span>
            <span class="row-status"></span>
        `;
	}

	refresh = () => {

		if (!this.cell || !this.tr) return;

		if (!this.closest("tbody")) return;

		this.classList.remove("is-insert", "is-update", "is-delete");

		const rawRecord = this.tr.data;

		if (rawRecord) {

			if (rawRecord.m === undefined) {

			} else {
				switch (rawRecord.m._[NINE_TABLE.META.INDEX.ROW_STATE]) {
					case NINE_TABLE.ROW_STATE.INSERT:
						this.classList.add("is-insert");
						break;
					case NINE_TABLE.ROW_STATE.UPDATE:
						this.classList.add("is-update");
						break;
					case NINE_TABLE.ROW_STATE.DELETE:
						this.classList.add("is-delete");
						break;
					default:
						break;
				}
			}
		}

		const displayNum = this.index + 1;
		const formattedNum = displayNum.toLocaleString();

		if (displayNum >= 10000) {

			const splitIndex = formattedNum.length - 4;
			const prefixPart = formattedNum.substring(0, splitIndex + 1);
			const suffixPart = formattedNum.substring(splitIndex + 1);

			this.#mainTarget.innerHTML = `
            	<span class="ng-row-prefix">${prefixPart}</span>
            	<span class="ng-row-suffix">${suffixPart}</span>
            	<div class="row-status"></div>
        	`;
		} else {
			this.#mainTarget.innerHTML = `${formattedNum}`;
		}

		const isSorted = this.sheet.querySelector("thead .asc,thead .desc") ? true : false;
		const isFitered = this.sheet.querySelector("thead nine-table-filter-button.filtered") ? true : false;

		this.#subTarget.innerHTML = this.row;
		this.#subTarget.style.display = (isSorted || isFitered) ? "" : "none";
	};
}

if (!customElements.get('cell-row-indicator')) {
	customElements.define("cell-row-indicator", CellRowIndicator);
}
