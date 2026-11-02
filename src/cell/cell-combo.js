import { trace } from "@nopeer";
import { EditableCellElement } from "./core/CellElement.js";
import "./cell-combo-panel.js";

export class CellCombo extends EditableCellElement {
	#targetBtn;
	#dataSource = [];
	#keyName;
	#valueName;
	#multi;
	#multiSeparator;
	#panel;

	constructor() {
		super();
		this.applyBaseStyle();
	}

	connectedCallback() {


		this.#renderer();
		super.connectedCallback();

		this.#keyName = super.cell.getAttribute("key-name") || "k";
		this.#valueName = super.cell.getAttribute("value-name") || "v";
		this.#multi = super.cell.getAttribute('multi') === "true";
		this.#multiSeparator = super.cell.getAttribute("multi-separator") || ",";

		this.#initData();
		this.#initEvent();
	}

	rerenderer = () => {
		trace.log("rerenderer");
		this.#initData();
		this.refresh();
	};

	#initData = () => {
		if (!super.sheet || !super.cell) return;

		const dataSource = super.cell?.getAttribute("data-source");
		if (!dataSource) return;

		// 🎯 공통 표현식 평가기를 통해 데이터 소스(배열 또는 함수 결과) 획득
		//this.#host.exprEngine.evaluate(dataSource, data, row);

		this.#dataSource = super.getExprValue(dataSource, super.tr.data, super.tr.dataset.row);
		//trace.log("*******************************", this.#dataSource);
	}

	#initEvent = () => {
		// 엔터 키 입력 시 드롭다운 토글
		/**
		this.addEventListener("keydown", e => {
			if (e.code === "Enter") {
				e.preventDefault();
				this.#togglePanel();
			}
		}); */

		// Light DOM 기준이므로 this 안에서 버튼 탐색
		this.querySelectorAll("button").forEach(btn => {
			btn.addEventListener("click", (e) => {
				e.stopPropagation();
				this.#togglePanel();
			});
		});
	}

	#togglePanel = () => {
		trace.log(new Date());
		if (!this.#panel) {
			// 🎯 필터링 패널 방식과 동일하게 현재 셀이 속한 sheet(또는 그리드) 탐색
			this.#panel = super.sheet.querySelector("cell-combo-panel");
			if (!this.#panel) {
				this.#panel = document.createElement("cell-combo-panel");
				super.sheet.appendChild(this.#panel);
			}
		}

		trace.log(new Date());

		if (this.#panel.isOpen && this.#panel.targetCell === this) {
			this.#panel.close();
		} else {
			this.#panel.open(this, this.#dataSource, this.#keyName, this.#valueName, this.#multi, this.#multiSeparator);
		}

		trace.log(new Date());
	}

	#renderer = () => {
		this.innerHTML = `
            <button class="btn1" type="button" tabindex="-1">Select</button>
            <button class="btn2" type="button" tabindex="-1"></button>
        `;

		// Light DOM 구조이므로 this에서 직접 쿼리
		this.#targetBtn = this.querySelector(".btn1");
	};

	refresh = () => {
		const v = super.refresh();
		if (!this.#targetBtn) return v;

		// 현재 값에 매칭되는 텍스트(표시명) 계산
		this.#targetBtn.textContent = this.#getDisplayText() || "Select";
		this.#validateInput();

		return v;
	};

	#getDisplayText = () => {
		if (!this.value || !Array.isArray(this.#dataSource)) return "";

		if (this.#multi) {
			const keys = String(this.value).split(this.#multiSeparator);
			return this.#dataSource
				.filter(m => keys.includes(String(m[this.#keyName])))
				.map(m => m[this.#valueName])
				.join(this.#multiSeparator);
		} else {
			const found = this.#dataSource.find(m => String(m[this.#keyName]) === String(this.value));
			return found ? found[this.#valueName] : this.value;
		}
	}

	#validateInput = () => {
		if (!super.cell) return;
		super.cell.classList.remove("invalid");

		if (this.value === null || this.value === undefined || this.value === "" || !Array.isArray(this.#dataSource)) {
			return;
		}

		const list = this.#multi ? String(this.value).split(this.#multiSeparator) : [this.value];
		for (const v of list) {
			const idx = this.#dataSource.findIndex(m => String(v) === String(m[this.#keyName]));
			if (idx < 0) {
				super.cell.classList.add("invalid");
				break;
			}
		}
	};

	get dataSource() {
		return this.#dataSource;
	}
}

if (!customElements.get('cell-combo')) {
	customElements.define("cell-combo", CellCombo);
}