import { trace } from "@nopeer";
import { EditableCellElement } from "./core/CellElement.js";

class CellRadio extends EditableCellElement {
	#target;
	#radioList = [];
	#dataSource = [];

	constructor() {
		super();
	}

	connectedCallback() {
		super.connectedCallback();

		this.#renderer();

		this.#rendererRadio();

		this.#initEvent();
	}

	#initEvent = () => {

		this.cell.addEventListener("keydown", e => {

			if (this.cell.hasAttribute("readonly") || this.cell.classList.contains("readonly")) return;
			if (this.cell.getAttribute("disabled") === "true") return;

			if (e.code === "Space") {
				e.preventDefault();

				let matchIndex = -1;

				this.#radioList.forEach(($el,index) => {
					if (this.value === $el.getAttribute("value")) {
						matchIndex = index;
						return false;
					}
				});

				matchIndex = (matchIndex === this.#radioList.length - 1) ? 0 : (matchIndex >= 0 ? matchIndex + 1 : 0);
				this.value = this.#radioList[matchIndex].getAttribute("value");

				this.sheet.rowManager.refresh(true);
			}
		});
	};

	#rendererRadio = () => {

		if (!this.host) return;

		const dataSource = this.cell.getAttribute("data-source");
		if (!dataSource) return;

		this.#dataSource = super.getExprValue(dataSource, this.tr.data, this.tr.dataset.row);

		this.#target.replaceChildren();

		if (this.#dataSource && Array.isArray(this.#dataSource)) {

			const fragment = document.createDocumentFragment();

			this.#dataSource.forEach(v => {
				const codeVal = v[this.#keyName] !== undefined ? v[this.#keyName] : '';
				const nameVal = v[this.#valueName] !== undefined ? v[this.#valueName] : '';

				const label = document.createElement('label');

				const input = document.createElement('input');
				input.type = 'radio';
				input.value = codeVal;

				const span = document.createElement('span');
				span.textContent = nameVal;

				label.appendChild(input);
				label.appendChild(span);
				fragment.appendChild(label);
			});

			this.#target.appendChild(fragment);


			this.#radioList = Array.from(this.querySelectorAll("input"));



			this.#radioList.forEach($el => {
				$el.addEventListener("change", (e) => {
					this.value = e.target.value;
					this.sheet.rowManager.refresh(true);
				});
			});
		}
	};

	#renderer = () => {

		this.innerHTML = `
			<div></div>
        `;

		this.#target = this.querySelector("div");
	};

	rerenderer = () => {
		this.#rendererRadio();
		this.refresh();
	};

	refresh = () => {

		const v = super.refresh();

		this.#radioList.forEach($el => {
			$el.checked = (v === $el.value);
		});

		if (this.isValid()) {
			this.#validate();
		}
	};

	#validate = () => {

		if (this.value === null || this.value === undefined || this.value === "" || !Array.isArray(this.#dataSource)) {
			return;
		}

		const idx = this.#dataSource.findIndex(m => this.value === m[this.#keyName]);
		if (idx < 0) {
			this.cell.classList.add("invalid");
		}
	};

	get dataSource() {
		return this.#dataSource;
	}

	get #keyName() {
		return this.cell.getAttribute("key-name") || "k";
	}

	get #valueName() {
		return this.cell.getAttribute("value-name") || "v";
	}
}

if (!customElements.get('cell-radio')) {
	customElements.define("cell-radio", CellRadio);
}