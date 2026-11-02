import { trace } from "@nopeer";
import { EditableCellElement } from "./core/CellElement.js";

class CellInputText extends EditableCellElement
{
	#target;

	constructor() {
		super();
	}
	
	connectedCallback() {

		super.connectedCallback();

		this.#renderer();

		this.#target = this.querySelector("input");

		this.#initEvent();
	};

	refresh = () => {
		const v = super.refresh();
		this.#target.value = v;
	};

	#initEvent = () => {
		this.#target.addEventListener("input", e => {
			if (this.#maxbyte) {
				const maxByteNum = Number(this.#maxbyte);
				const currentBytes = nine.getByteLength(e.target.value);

				if (currentBytes > maxByteNum) {
					e.target.value = nine.cut(e.target.value, maxByteNum);
					this.value = e.target.value;
				}
			}
		});

		this.#target.addEventListener("change", (event) => {
			this.value = event.target.value;
			this.sheet.rowManager.refresh(true);
		});
	};

	#renderer = () => {

		this.innerHTML = `
			<input type="text" ondragstart="return false;">
		`;
	};

	get #maxbyte() {
		return this.cell.getAttribute("maxbyte") || this.cell.getAttribute("max-byte");
	}
}

if (!customElements.get('cell-input')) {
	customElements.define("cell-input", CellInputText);
}
