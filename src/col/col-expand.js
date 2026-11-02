// ui/col/col-expand.js
import { TableCompiler, COLLAPSED_WIDTH } from "@/layout/core/TableCompiler.js";

export class ColExpand extends HTMLElement {
    #sheet;
    #cell;

    constructor() {
        super();
    }

    connectedCallback() {
        this.#cell = this.closest('th, td');
        this.#sheet = this.closest('nine-table-sheet');

        if (this.#cell) {
            this.#cell.style.position = 'relative';
        }

        const isCollapsed =
            this.getAttribute('collapsed') === 'true' ||
            this.#cell?.getAttribute('collapsed') === 'true';

        if (isCollapsed) {
            requestAnimationFrame(() => {
                this.collapse(true);
            });
        } else {
            this.classList.remove('collapsed');
            this.classList.add('expand');
        }

        this.removeEventListener('click', this.#onClick);
        this.addEventListener('click', this.#onClick);
    }

    #onClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (this.classList.contains('expand')) {
            this.collapse();
        } else {
            this.expand();
        }
    };

    /**
     * 🎯 원래 너비(dataset.expandWidth)로 복구
     */
    expand = () => {
        if (!this.#sheet?.colResizer || !this.#cell) return;
        const colIndex = parseInt(this.#cell.dataset.col, 10);
        const colSpan = this.#cell.colSpan || 1;

        this.classList.remove('collapsed');
        this.classList.add('expand');
        this.#cell.setAttribute('collapsed', 'false');
        this.#cell.style.color = '';

        const targetWidth = parseInt(this.#cell.dataset.expandWidth, 10) || 100;

        if (colSpan === 1) {
            this.#sheet.colResizer.setColumnWidth(colIndex, targetWidth);
        } else {
            const singleWidth = Math.max(30, Math.floor(targetWidth / colSpan));
            for (let i = 0; i < colSpan; i++) {
                this.#sheet.colResizer.setColumnWidth(colIndex + i, singleWidth);
            }
        }

        requestAnimationFrame(() => {
            if (typeof this.#sheet.refreshLayout === 'function') {
                this.#sheet.refreshLayout();
            }
        });
    };

    collapse = (isInitialInit = false) => {
        if (!this.#sheet?.colResizer || !this.#cell) return;
        const colIndex = parseInt(this.#cell.dataset.col, 10);
        const colSpan = this.#cell.colSpan || 1;

        if (this.classList.contains('expand')) {
            const col = this.#sheet.querySelector(`colgroup col[data-col="${colIndex}"]`);
            const currentW = col ? parseInt(col.getAttribute('width'), 10) : 0;
            if (currentW > COLLAPSED_WIDTH) {
                this.#cell.dataset.expandWidth = String(currentW * colSpan);
            }
        }

        this.classList.remove('expand');
        this.classList.add('collapsed');
        this.#cell.setAttribute('collapsed', 'true');
        this.#cell.style.color = 'transparent';

        // 🎯 colSpan이 1이면 16px(COLLAPSED_WIDTH)을 그대로 적용, 2 이상이면 균등 분할
        if (colSpan === 1) {
            this.#sheet.colResizer.setColumnWidth(colIndex, COLLAPSED_WIDTH);
        } else {
            const splitWidth = Math.max(10, Math.floor(COLLAPSED_WIDTH / colSpan));
            for (let i = 0; i < colSpan; i++) {
                this.#sheet.colResizer.setColumnWidth(colIndex + i, splitWidth);
            }
        }

        requestAnimationFrame(() => {
            if (typeof this.#sheet.refreshLayout === 'function') {
                this.#sheet.refreshLayout();
            }
        });
    };

    disconnectedCallback() {
        this.removeEventListener('click', this.#onClick);
    }
}

if (!customElements.get('nine-table-col-expand')) {
    customElements.define('nine-table-col-expand', ColExpand);
}