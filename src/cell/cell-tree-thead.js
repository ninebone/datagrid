import { TheadCellElement } from "./core/CellElement.js";
import { trace } from "@nopeer";

export class CellTreeThead extends TheadCellElement {

	#textElement;

	constructor() {
		super();
	}

	connectedCallback() {
		super.connectedCallback();

		this.#init();
	}

	#init = () => {
		this.#renderer();
		this.#initEvent();
	}



	refresh() {

		this.#updateTreeState();
	}

	#renderer = () => {
		const content = this.getAttribute("content") || "";

		this.innerHTML = `
			<span class="wrapper">${content}</span>
			<div class="tree-icons-container"></div>
        `;

		const groupCnt = this.sheet?.source.table.querySelectorAll("tbody tr[group-by]").length;

		if (groupCnt > 0) this.#renderDepthIcons(groupCnt);

		this.#textElement = this.querySelector(".tree-text");
	}


	#renderDepthIcons(totalDepth) {
		const iconContainer = this.querySelector(".tree-icons-container");
		if (!iconContainer) return;

		iconContainer.innerHTML = "";

		for (let i = 0; i < totalDepth; i++) {
			const iconSpan = document.createElement("div");

			iconSpan.classList.add("expand-mix");
			iconSpan.title = `Toggle Level ${i + 1} Group`;
			iconSpan.dataset.targetDepth = i; // 이 아이콘이 제어할 뎁스 번호

			iconContainer.appendChild(iconSpan);
		}
	}

	#initEvent = () => {
		this.addEventListener("click", (e) => {
			e.stopPropagation();
			const iconOn = e.target.closest(".expand-on");
			const iconOff = e.target.closest(".expand-off");
			const iconMix = e.target.closest(".expand-mix");
			const target = iconOn || iconOff || iconMix;

			if (!target) return;

			const depth = parseInt(target.dataset.targetDepth, 10);
			const grouping = this.sheet.grouping;

			if (iconOn) {
				grouping.collapse(depth);
			} else if (iconOff) {
				grouping.expand(depth);
			} else {
				grouping.collapse(depth);
			}

			this.#updateTreeState();
		});
	}

	#updateTreeState() {
		const icons = this.querySelectorAll(".expand-off,.expand-on,.expand-mix");
		if (!icons || icons.length === 0) return;

		icons.forEach(icon => {
			const targetDepth = parseInt(icon.dataset.targetDepth, 10);
			const isCollapsed = this.#isCollapsed(targetDepth);

			icon.classList.remove("expand-off", "expand-on", "expand-mix");

			if (isCollapsed === true) {
				icon.classList.add("expand-off");
			} else if (isCollapsed === false) {
				icon.classList.add("expand-on");
			} else {
				icon.classList.add("expand-mix");
			}
		});
	}

	#isCollapsed(targetDepth) {

		let targetGroupIds = [];

		for (const [groupId, isCollapsed] of this.sheet.grouping.groupMap.entries()) {
			const depth = groupId.split('_').length - 2;

			if (depth === targetDepth) {
				targetGroupIds.push(groupId);
			}
		}

		if (targetGroupIds.length === 0) return null;

		const collapsedCount = targetGroupIds.filter(groupId => { return this.sheet.grouping.collapsedMap.get(groupId) === true; }).length;

		return (collapsedCount === targetGroupIds.length) ? true : (collapsedCount === 0) ? false : null;
	}
}

if (!customElements.get('cell-tree-thead')) {
	customElements.define('cell-tree-thead', CellTreeThead);
}