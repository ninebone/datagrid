import { trace } from "@nopeer";
import { CellElement } from "./core/CellElement.js"; // Inherits from CellElement instead of EditableCellElement

class CellRenderer extends CellElement {
	#target;

	constructor() {
		super();
	}

	connectedCallback() {
		super.connectedCallback();

		// Debug trace for inspecting component context and parent elements
		// trace.log("******************", this, this.host, this.sheet, this.tr, this.cell);

		this.#renderer();

		// Cache the internal text span target element
		this.#target = this.querySelector("span");
	}

	/**
	 * Refreshes the cell display value based on binding and expression evaluations.
	 */
	refresh = () => {

		super.refresh();

		if (this.cell.getAttribute("html") === "true") {
			this.#target.innerHTML = this.getDisplayText();
		} else {
			this.#target.textContent = this.getDisplayText();
		}
	};

	/**
	 * Renders the internal markup and CSS layout rules for the cell renderer.
	 */
	#renderer = () => {
		this.innerHTML = `
            <span class="wrapper"></span>
       `;
	};
}

// Register the custom element if not already defined
if (!customElements.get("cell-renderer")) {
	customElements.define("cell-renderer", CellRenderer);
}