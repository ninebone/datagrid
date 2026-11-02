import { trace } from "@nopeer";
import { CellElement } from "./core/CellElement.js";

class CellRenderer extends CellElement {
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

		super.refresh();

		if (this.cell.getAttribute("html") === "true") {
			this.#target.innerHTML = this.getDisplayText();
		} else {
			this.#target.textContent = this.getDisplayText();
		}
	};

	#renderer = () => {
		this.innerHTML = `
            <span class="wrapper"></span>
       `;
	};
}

if (!customElements.get("cell-renderer")) {
	customElements.define("cell-renderer", CellRenderer);
}