import { trace } from "@nopeer";
import { CellElement } from "./core/CellElement.js";

class CellRowIndicator extends CellElement {
	#mainTarget;
	#subTarget;
	#statusTarget;

	constructor() {
		super();
		this.applyBaseStyle();
	}

	connectedCallback() {
		this.#renderer();
		super.connectedCallback?.();

		if (this.cell) {
			this.cell.removeAttribute("tabindex");
			this.cell.dataset.bind = "rowState";

			if (!this.cell.dataset.expr) {
				this.cell.dataset.expr = "data.__ng._[ninegrid.ROW.ORDER]";
			}

			this.cell.setAttribute("text-align", "center");
		}

		this.#mainTarget = this.querySelector(".ng-row-main");
		this.#subTarget = this.querySelector(".ng-row-sub");
		this.#statusTarget = this.querySelector(".ng-row-status");
	}

	#renderer = () => {
		this.innerHTML = `
			<span class="ng-row-main"></span>
            <span class="ng-row-sub"></span>
            <span class="ng-row-status"></span>
        `;
	}

	/**
	 * 행 번호 및 상태 갱신
	 */
	refresh = () => {
		if (!this.cell || !this.tr) return;

		const row = this.row;
		if (isNaN(row)) return;

		const rawRecord = this.tr.data;

		if (rawRecord && rawRecord.__ng) {
			const rowState = rawRecord.__ng.rowState;

			/**
			// 1. 행 상태에 따른 클래스 제어 및 우측 상단 상태 표시
			if (rowState === ninegrid.ROW_STATE.INSERT) {
				this.classList.add('added');
				this.classList.remove('updated');
				if (this.#statusTarget) this.#statusTarget.textContent = "➕";
			} else if (rowState === ninegrid.ROW_STATE.UPDATE) {
				this.classList.add('updated');
				this.classList.remove('added');
				if (this.#statusTarget) this.#statusTarget.textContent = "✏️";
			} else {
				this.classList.remove('added', 'updated');
				if (this.#statusTarget) this.#statusTarget.textContent = "";
			} */

			/**
			// 2. 필터링 등으로 순번이 밀렸을 때 우측 하단에 원본 번호 표시
			if (rawRecord.__ng.i !== undefined) {
				const currentSeq = row + 1;
				const originalSeq = rawRecord.__ng.i + 1;

				if (this.#subTarget) {
					if (currentSeq !== originalSeq) {
						this.#subTarget.textContent = originalSeq;
					} else {
						this.#subTarget.textContent = "";
					}
				}
			} */
		}

		const displayNum = this.index + 1;

		// 천단위 콤마 포맷팅 (예: 1234567 -> "1,234,567")
		const formattedNum = displayNum.toLocaleString();

		// 3자리 이상일 경우 마지막 3자리(와 콤마 포함된 덩어리)를 기준으로 앞자리와 분리
		if (displayNum >= 10000) {
			// 뒤에서 4글자(콤마 + 3자리)를 기준으로 분리합니다. (예: "1,234" 와 "567")
			const splitIndex = formattedNum.length - 4;
			const prefixPart = formattedNum.substring(0, splitIndex + 1); // 천단위 이상 (작은 폰트)
			const suffixPart = formattedNum.substring(splitIndex + 1);     // 마지막 콤마 + 3자리 (기본 폰트)

			this.#mainTarget.innerHTML = `
             <span class="ng-row-prefix">${prefixPart}</span>
             <span class="ng-row-suffix">${suffixPart}</span>
          `;
		} else {
			// 1000 미만인 경우 콤마만 있거나 일반 숫자로 그대로 표시
			this.#mainTarget.innerHTML = `${formattedNum}`;
		}

		const isSorted = this.sheet.querySelector("thead .asc,thead .desc") ? true : false;
		const isFitered = this.sheet.querySelector("thead nine-table-filter-button.filtered") ? true : false;

		this.#subTarget.innerHTML = row;
		this.#subTarget.style.display = (isSorted || isFitered) ? "" : "none";
	};
}

if (!customElements.get('cell-row-indicator')) {
	customElements.define("cell-row-indicator", CellRowIndicator);
}