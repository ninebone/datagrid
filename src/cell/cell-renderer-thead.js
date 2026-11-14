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

	refresh = () => {

		//super.refresh();

		if (this.cell.getAttribute("html") === "true") {
			this.#target.innerHTML = this.getDisplayText(this.#content);
		} else {
			this.#target.textContent = this.getDisplayText(this.#content);
		}
	};

	#renderer = () => {
		this.innerHTML = `
            <span class="wrapper">${this.#content}</span>
       `;
	};

	get #content() {
		return this.getAttribute("content") || "";
	}
}

if (!customElements.get("cell-renderer-thead")) {
	customElements.define("cell-renderer-thead", CellRendererThead);
}