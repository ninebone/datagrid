import { trace } from "@nopeer";
import { TheadCellElement } from "./core/CellElement.js";

class CellRendererThead extends TheadCellElement {
	#target;

	constructor() {
		super();
	}

	connectedCallback() {

		super.connectedCallback();

		this.#renderer();

		this.#target = this.querySelector("span");
	}

	/**
	refresh = () => {

		super.refresh();

		if (this.cell.getAttribute("html") === "true") {
			this.#target.innerHTML = this.getDisplayText();
		} else {
			this.#target.textContent = this.getDisplayText();
		}
	}; */

	#renderer = () => {
		const content = this.getAttribute("content") || "";

		this.innerHTML = `
            <span class="wrapper">${content}</span>
       `;
	};
}

if (!customElements.get("cell-renderer-thead")) {
	customElements.define("cell-renderer-thead", CellRendererThead);
}