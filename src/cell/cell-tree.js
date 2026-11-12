import { CellElement } from "./core/CellElement.js";
import { NINE_TABLE } from "@/core/constants.js";
import { trace } from "@nopeer";

export class CellTree extends CellElement {

	#iconElement;
	#textElement;

	constructor() {
		super();
	}

	connectedCallback() {
		super.connectedCallback();

		this.#init();
	}

	#groupExprValue = () => {
		const records = this.data;

		return "...";
	}
	/**
	 * 데이터그리드 셀 표준 refresh 사이클에 맞춰 호출
	 */
	refresh() {

		if (this.tr.style.display === "none") return;

		const groupId = this.tr.dataset.groupId;

		const record = this.data; // 행 데이터 레코드
		if (!record) return;

		const level = groupId ? groupId?.split("_").length - 2 : this.sheet.grouping.columns.length;

		this.style.setProperty('--tree-level', level);

		// 2. 텍스트 표시 (data-bind 또는 data-expr 결과 등)
		this.#textElement.textContent = this.getDisplayText();//this.textContent || record[this.getAttribute("data-bind")] || '';

		// 3. 트리 아이콘 및 상태 반영
		this.#updateTreeState(record);
	}

	#updateTreeState(record) {
		const hasChildren = this.#checkHasChildren(record);

		const isCollapsed = this.sheet.grouping.isCollapsed(this.tr.dataset.groupId);

		this.#iconElement.className = "icon";

		this.#iconElement.classList.remove("expand-on,expand-off");

		if (hasChildren) {
			this.#iconElement.classList.add(isCollapsed ? "expand-off" : "expand-on");
		} else {
			this.#iconElement.classList.add("node");
		}
	}

	#checkHasChildren(record) {
		// 자식 존재 여부 판단 로직
		return this.tr.data.length > 0;
	}

	#init = () => {
		this.#renderer();
		this.#initEvent();
	}

	#renderer = () => {
		this.innerHTML = `
	        <div class="item">
                <div class="icon"></div>
                <span class="tree-text"></span>
            </div>
        `;

		this.#iconElement = this.querySelector(".icon");
		this.#textElement = this.querySelector(".tree-text");
	}

	#initEvent = () => {
		this.#iconElement.addEventListener("click", (e) => {
			e.stopPropagation();
			this.sheet.grouping.toggleGroup(this.tr.dataset.groupId);
		});
	}
}

if (!customElements.get('cell-tree')) {
	customElements.define('cell-tree', CellTree);
}