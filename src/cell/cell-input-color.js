import { trace } from "@nopeer";
import { EditableCellElement } from "./core/CellElement.js";

class CellInputColor extends EditableCellElement
{
	#target;
	#btn;
	#dataSource;

	constructor () {
		super();
	}

	connectedCallback() {

		super.connectedCallback();

		this.#renderer();

		this.#target = this.querySelector("input[type=color]");
		this.#btn = this.querySelector("button");

		//this.#rendererColor();

		this.#initEvent();
	};

	#initEvent = () => {
		this.#btn.addEventListener("click", () => {
			this.#target.click();
		});

		// 색상 변경 즉시 반영
		this.#target.addEventListener("input", (event) => {
			const val = event.target.value;
			this.value = val;
			this.#validate(val);

			this.sheet.rowManager.refresh(true);
		});

		this.#target.addEventListener("change", (event) => {
			const val = event.target.value;
			this.value = val;
			this.#validate(val);

			this.sheet.rowManager.refresh(true);
		});
	}

	#renderer = () => {
		this.innerHTML = `
          <input type="color" ondragstart="return false;">
          <button tabindex="-1" type="button"></button>
       `;
	};

	rerenderer = () => {
		//this.#rendererColor();
		this.refresh();
	};

	#rendererColor = () => {

		if (!this.tr.data) {
			//return;
			//trace.log(this.tr.cloneNode(true))
		}

		const dataSource = this.cell.getAttribute("data-source");
		if (!dataSource) return;

		this.#dataSource = super.getExprValue(dataSource, this.tr.data, this.tr.dataset.row);

		//trace.log(dataSource, this.#dataSource, this.tr.data);

		this.querySelector("datalist")?.remove();

		if (this.#dataSource && Array.isArray(this.#dataSource)) {
			// 2. 고유 ID 생성 (datalist와 input을 연결하기 위함)
			const datalistId = `color-list-${Math.random().toString(36).substr(2, 9)}`;

			// 3. <datalist> 생성
			const datalist = document.createElement('datalist');
			datalist.id = datalistId;

			const fragment = document.createDocumentFragment();

			this.#dataSource.forEach(v => {
				if (v.value) {
					const option = document.createElement('option');
					option.value = v.value;
					fragment.appendChild(option);
				}
			});

			datalist.appendChild(fragment);
			this.appendChild(datalist);

			// 4. <input type="color">에 list 속성 부여하여 datalist 연결
			this.#target.setAttribute("list", datalistId);
		}
	};

	refresh = () => {
		if (!this.tr.data) return;

		const v = super.refresh();

		/** datasource(datalist) refresh */
		this.#rendererColor();

		this.#target.value = v !== undefined && v !== null && v !== "" ? v : "#ffffff";

		if (this.isValid()) {
			this.#validate();
		}
	};

	#validate = () => {

		const v = this.#target.value;

		if (v !== "" && v !== null && v !== undefined) {
			if (!this.#isValidColor(v)) {
				this.cell.classList.add("invalid");
			}
			else if (this.#dataSource && Array.isArray(this.#dataSource) && this.#dataSource.length > 0) {
				const exists = this.#dataSource.some(item => {
					const itemCode = item.value !== undefined ? item.value : (item.code !== undefined ? item.code : '');
					// 대소문자 구분 없이 비교하기 위해 toLowerCase 처리
					return itemCode.toLowerCase() === v.toLowerCase();
				});

				if (!exists) {
					this.cell.classList.add("invalid");
				}
			}
		}
	};

	#isValidColor = (v) => {
		if (typeof v !== "string" || v.length != 7 || !v.startsWith("#")) return false;

		var r = parseInt(v.substr(1, 2), 16);
		var g = parseInt(v.substr(3, 2), 16);
		var b = parseInt(v.substr(5, 2), 16);

		if (isNaN(r) || isNaN(g) || isNaN(b)) return false;
		if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) return false;

		return true;
	}
}

if (!customElements.get('cell-input-color')) {
	customElements.define("cell-input-color", CellInputColor);
}