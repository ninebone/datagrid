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

		const record = this.data; // 행 데이터 레코드
		if (!record) return;

		let level;
		if (this.sheet.isGroupBy) {
			const groupId = this.tr.dataset.groupId;
			level = groupId ? groupId?.split("_").length - 2 : this.sheet.grouping.columns.length;
		}
		else {
			level = parseInt(this.tr.dataset.depth, 10);
		}

		//const level = id ? id.split("_").length - 2 : (this.sheet?.grouping?.columns?.length || 0);

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

		const id = this.tr.dataset.groupId || this.tr.dataset.nodeId;
		const collapseState = this.#getCollapseState(id);

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

	#getCollapseState(id) {

		if (this.sheet.isGroupBy) {
			const grouping = this.sheet?.grouping;
			if (!grouping || !id) return false;

			return grouping.isCollapsed(id);
		}
		else if (this.sheet.isTree) {
			const treeManager = this.sheet?.treeManager;
			if (treeManager && this.tr.dataset.nodeId) {
				return treeManager.isCollapsed(id);
			}
		}

		return false;
	}

	#checkHasChildren(record) {
		if (this.sheet.isGroupBy) {
			return this.tr.data && this.tr.data.length > 0;
		} else if (this.sheet.isTree) {
			return this.tr.dataset.hasChildren === "true" ? true : false;
		}

		return false;
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

			const id = this.tr.dataset.groupId || this.tr.dataset.nodeId;
			const currentIndex = parseInt(this.tr.dataset.index, 10);
			if (isNaN(currentIndex)) return;

			// 💡 트리 매니저와 기존 그룹핑 토글을 상황에 맞게 매핑
			const treeManager = this.sheet?.treeManager;
			const isTreeMode = !!(treeManager && this.tr.dataset.nodeId);

			const isCollapsed = isTreeMode
				? treeManager.isCollapsed(id)
				: (this.sheet?.grouping ? this.sheet.grouping.isCollapsed(id) : false);

			const visibleTrs = Array.from(this.sheet.querySelectorAll('.ng-container-body tbody.body tr'))
				.filter($tr => $tr.style.display !== 'none');

			const targetTrs = visibleTrs.filter($tr => {
				const trIndex = parseInt($tr.dataset.index, 10);
				return !isNaN(trIndex) && trIndex > currentIndex;
			});

			const toggleAction = () => {
				if (isTreeMode) {
					treeManager.toggleNode(id);
				} else if (this.sheet?.grouping) {
					this.sheet.grouping.toggleGroup(id);
				}
			};

			if (targetTrs.length === 0) {
				toggleAction();
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
					toggleAction();

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
					toggleAction();

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