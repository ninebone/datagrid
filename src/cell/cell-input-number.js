import { trace } from "@nopeer";
import { EditableCellElement } from "./core/CellElement.js";

class CellInputNumber extends EditableCellElement
{
	#target;

	constructor () {
		super();
	}

	connectedCallback() {

		super.connectedCallback();

		this.#renderer();

		this.#target = this.querySelector("input");

		this.#initEvent();


	};

	#renderer = () => {
		this.innerHTML = `
          <input type="text" ondragstart="return false;">
       `;
	};

	#initEvent = () => {
		this.#target.addEventListener("keydown", this.#onKeyDown);

		this.#target.addEventListener("input", (event) => {
			this.value = event.target.value;
			this.sheet.rowManager.refresh(true);
		});

		this.#target.addEventListener("change", (event) => {
			this.value = event.target.value;
			this.sheet.rowManager.refresh(true);
		});
	};

	refresh = () => {
		const v = super.refresh();

		this.#target.value = v;//v !== undefined && v !== null ? v : "";

		if (this.isValid()) {
			this.#validate();
		}
	};

	#validate = () => {

		const v = this.#target.value;

		if (v !== "" && v !== null && v !== undefined) {
			const num = Number(v);

			if (isNaN(num) || (this.#max && num > Number(this.#max)) || (this.#min && num < Number(this.#min))) {
				this.cell.classList.add("invalid");
			}
			else if (this.#scale) {
				const str = String(v);
				const idx = str.indexOf('.');
				if (idx >= 0 && str.substring(idx + 1).length > Number(this.#scale)) {
					this.cell.classList.add("invalid");
				}
			}
		}
	};

	#onKeyDown = e => {

		if (["Escape", "Enter", "Tab", "Home", "End", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Backspace", "Delete"].includes(e.code)) return;

		const target = e.target;
		const value = target.value;
		const selectionStart = target.selectionStart;
		const key = e.key;

		if (key === "-") {
			if (value.includes("-") || selectionStart !== 0) {
				e.preventDefault();
				return;
			}
		}

		if (key === ".") {
			const scale = Number(this.#scale);

			if (isNaN(scale) || scale <= 0 || value.includes(".")) {
				e.preventDefault();
				return;
			}
		}

		let validKey = [];
		if (this.#scale && Number(this.#scale) > 0) validKey.push(".");
		if (this.#min || Number(this.#min) > 0) validKey.push("-");

		const isNumKey = (e.keyCode >= 48 && e.keyCode <= 57) || (e.keyCode >= 96 && e.keyCode <= 105);

		if (!isNumKey && !validKey.includes(e.key)) {
			e.preventDefault();
			return;
		}

		if (this.#scale && isNumKey && e.target.selectionStart == e.target.selectionEnd) {
			const s = e.target.value;
			const idx = s.indexOf(".");
			if (idx >= 0 && e.target.selectionStart > idx) {
				const decimalPart = s.substr(idx + 1);
				if (decimalPart.length >= Number(this.#scale)) {
					e.preventDefault();
				}
			}
		}

		if (this.#maxbyte && nine.getByteLength(e.target.value) >= Number(this.#maxbyte) && e.target.selectionStart == e.target.selectionEnd) {
			e.preventDefault();
		}
	}

	get #min() {
		return this.cell.getAttribute("min") || "";
	}

	get #max() {
		return this.cell.getAttribute("max") || "";
	}

	get #scale() {
		return this.cell.getAttribute("scale") || "";
	}

	get #maxbyte() {
		return this.cell.getAttribute("maxbyte") || this.cell.getAttribute("max-byte");
	}
}

if (!customElements.get('cell-input-number')) {
	customElements.define("cell-input-number", CellInputNumber);
}