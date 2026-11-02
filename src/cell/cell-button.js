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

		// 부모 클래스의 connectedCallback 호출 (필수)
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

	/**
	 * 레거시 dataRefresh 패턴 반영 (표현식 동적 평가 및 스타일링)
	 */
	refresh = () => {
		const rawValue = super.refresh ? super.refresh() : this.value;
		//let displayValue = this.getDisplayText(rawValue);
		this.#target.innerHTML = this.getDisplayText(rawValue);

		/**
		// 행 데이터 및 인덱스 확보
		const rowIdx = parseInt(super.cell.dataset.row, 10);
		const rowData = super.host?.data?.get ? super.host.data.get(rowIdx) : (this.closest("tr")?.data);

		if (rowData && !isNaN(rowIdx)) {
			["color", "background", "border"].forEach(attrName => {
				const expr = this.getAttribute(attrName);
				if (expr && this.#target) {
					const evaluatedVal = super.getExprValue ? super.getExprValue(expr, rowData, rowIdx, super.cell) : expr;
					this.#target.style[attrName] = evaluatedVal;
				}
			});
		} */
	};

	#renderer = () => {
		/**
		const allowedAttrs = ["color", "background", "border", "class", "style"];
		const attrList = [];

		for (let i = 0; i < this.attributes.length; i++) {
			const attr = this.attributes[i];
			if (allowedAttrs.includes(attr.name)) {
				attrList.push(`${attr.name}="${attr.value}"`);
			}
		} */

		const cell = this.closest("th,td");

		const buttonText = "...";//this.getAttribute("text") || super.attr["text"] || "";
		const height = (parseInt(cell.offsetHeight, 10) || 32) - 8;

		this.innerHTML = `
            <button class="button">${buttonText}</button>
        `;
	};
}

if (!customElements.get('cell-button')) {
	customElements.define("cell-button", CellButton);
}