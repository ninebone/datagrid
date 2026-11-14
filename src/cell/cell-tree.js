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

	refresh() {

		if (this.tr.style.display === "none") return;

		const groupId = this.tr.dataset.groupId;

		const record = this.data; // 행 데이터 레코드
		if (!record) return;

		const level = groupId ? groupId?.split("_").length - 2 : this.sheet.grouping.columns.length;

		this.style.setProperty('--tree-level', level);


		if (this.cell.getAttribute("html") === "true") {
			this.#textElement.innerHTML = this.getDisplayText();
		} else {
			this.#textElement.textContent = this.getDisplayText();
		}


		this.#updateTreeState(record);
	}

	#updateTreeState(record) {
		const hasChildren = this.#checkHasChildren(record);
		if (!hasChildren) {
			this.#iconElement.className = "icon node";
			return;
		}

		const groupId = this.tr.dataset.groupId;
		const collapseState = this.#getGroupCollapseState(groupId);

		this.#iconElement.className = "icon";
		this.#iconElement.classList.remove("expand-on", "expand-off", "expand-mix");

		if (collapseState === true) {
			this.#iconElement.classList.add("expand-off");
		} else if (collapseState === false) {
			this.#iconElement.classList.add("expand-on");
		} else {
			this.#iconElement.classList.add("expand-mix");
		}
	}

	#getGroupCollapseState(groupId) {
		const grouping = this.sheet?.grouping;
		if (!grouping || !groupId) return false;

		return grouping.isCollapsed(groupId);
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
		this.#iconElement.addEventListener("click", async (e) => {
			e.stopPropagation();

			const groupId = this.tr.dataset.groupId;
			const currentIndex = parseInt(this.tr.dataset.index, 10);
			if (isNaN(currentIndex)) return;

			const isCollapsed = this.sheet.grouping.isCollapsed(groupId);

			const visibleTrs = Array.from(this.sheet.querySelectorAll('.ng-container-body tbody.body tr'))
				.filter($tr => $tr.style.display !== 'none');

			const targetTrs = visibleTrs.filter($tr => {
				const trIndex = parseInt($tr.dataset.index, 10);
				return !isNaN(trIndex) && trIndex > currentIndex;
			});


			if (targetTrs.length === 0) {
				this.sheet.grouping.toggleGroup(groupId);
				return;
			}

			if (!isCollapsed) {
				let totalHeight = 0;
				targetTrs.forEach($tr => {
					$tr.classList.remove('tree-expand', 'tree-collapse');
					void $tr.offsetWidth;
					totalHeight += $tr.getBoundingClientRect().height;
				});

				targetTrs.forEach($tr => {
					$tr.style.transform = `translateY(-${totalHeight}px)`;
					$tr.classList.add('tree-collapse');
				});

				setTimeout(() => {
					this.sheet.grouping.toggleGroup(groupId);

					targetTrs.forEach($tr => {
						$tr.classList.remove('tree-collapse');
						$tr.style.transform = '';
					});
				}, 500);

			} else {

				const viewRect = this.sheet.querySelector(".ng-sheet-body").getBoundingClientRect();
				const cellRect = this.tr.getBoundingClientRect();
				const totalHeight = viewRect.bottom - cellRect.bottom;

				targetTrs.forEach($tr => {
					$tr.style.transform = `translateY(${totalHeight}px)`;
					$tr.classList.add('tree-expand');
				});

				targetTrs.forEach($tr => void $tr.offsetWidth);

				setTimeout(() => {
					this.sheet.grouping.toggleGroup(groupId);

					targetTrs.forEach($tr => {
						$tr.classList.remove('tree-expand');
						$tr.style.transform = '';
					});
				}, 500);
			}
		});
	}
}

if (!customElements.get('cell-tree')) {
	customElements.define('cell-tree', CellTree);
}