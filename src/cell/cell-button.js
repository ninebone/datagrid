import { CellElement } from "./core/CellElement.js";
import { NINE_TABLE } from "@/core/constants.js";
import { trace } from "@nopeer";

export class CellButton extends CellElement {
	#target;

	constructor() {
		super();
	}

	connectedCallback() {

		this.#renderer();

		super.connectedCallback();

		this.#target = this.querySelector("button");

		this.#target.removeEventListener("click", this.#cellButtonClick);
		this.#target.addEventListener("click", this.#cellButtonClick);
	}

	#cellButtonClick = e => {
		e.stopPropagation();

		const rowid = parseInt(this.cell.dataset.row, 10);

		const customEvent = new CustomEvent(NINE_TABLE.EVENT.CELL_BUTTON_CLICK, {
			bubbles: true,
			composed: true,
			detail: {
				originalEvent: e,
				cell: this.cell,
				row: rowid,
				col: parseInt(this.cell.dataset.col, 10),
				bind: this.dataset.bind,
				data: this.host.data.get(rowid),
				value: this.value,
			}
		});

		this.dispatchEvent(customEvent);
	};

	refresh = () => {
		const rawValue = super.refresh ? super.refresh() : this.value;
		//let displayValue = this.getDisplayText(rawValue);
		this.#target.innerHTML = this.getDisplayText(rawValue);
	};

	#renderer = () => {

		const buttonText = "...";//this.getAttribute("text") || super.attr["text"] || "";

		this.innerHTML = `
            <button class="button">${buttonText}</button>
        `;
	};
}

if (!customElements.get('cell-button')) {
	customElements.define("cell-button", CellButton);
}