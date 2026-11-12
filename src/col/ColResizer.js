// ui/col/ColResizer.js
import { trace } from "@nopeer";
import { COLLAPSED_WIDTH } from "@/layout/core/TableCompiler.js";

const RESIZE_OFFSET = 2; // 🎯 리사이즈 감지 영역 오프셋을 상단으로 추출

export class ColResizer {
    #sheet;
    #host;
    #panel;
    #tooltip;

    #targetColIndex = null;
    #nextColIndex = null;
    #targetContainerType = null;
    #targetCell = null;
    #startX = 0;
    #startColWidth = 0;
    #nextColStartWidth = 0;
    #startCellWidth = 0;
    #startLeft = 0;

    constructor(sheet) {
        this.#sheet = sheet;
        this.#host = sheet.getRootNode().host;
        this.#panel = this.#sheet.querySelector('nine-table-col-resizer-panel');

        this.#tooltip = this.#panel.querySelector('.resizer-overlay');
        this.bindEvents();
    }

    destroy() {
        this.#sheet.removeEventListener('pointermove', this.#onPointerMove);
        this.#sheet.removeEventListener('pointerdown', this.#onPointerDown);
        this.#sheet.removeEventListener('dblclick', this.#onDblClick);
    }

    refreshLayout(containerType = 'body') {
        const containers = Array.from(this.#sheet.querySelectorAll(`.ng-container-${containerType}`));
        if (containers.length === 0) return;

        const isFixedContainer = containerType === 'left' || containerType === 'right';
        const isAutoFit = !isFixedContainer && (
            this.#sheet.isAutoFitCol ||
            containers[0].querySelector('table')?.getAttribute('auto-fit-col') === 'true'
        );

        if (!isAutoFit) {

            const firstColgroup = containers[0].querySelector('table colgroup');
            if (!firstColgroup) return;

            let totalWidth = 0;
            const colWidths = {};

            Array.from(firstColgroup.querySelectorAll('col')).forEach(col => {
                const colIdx = col.getAttribute('data-col');
                const w = parseInt(col.getAttribute('width'), 10);
                if (!isNaN(w)) {
                    colWidths[colIdx] = w;
                    totalWidth += w;
                }
            });

            containers.forEach(container => {
                const tables = container.querySelectorAll('table');

                if (containerType === 'body') {
                    tables.forEach(tbl => {
                        tbl.style.width = `${totalWidth}px`;
                        //tbl.style.minWidth = `${totalWidth}px`;
                    });
                } else {
                    container.style.flex = `0 0 ${totalWidth}px`;
                    container.style.width = `${totalWidth}px`;
                    container.style.minWidth = `${totalWidth}px`;
                    container.style.maxWidth = `${totalWidth}px`;

                    tables.forEach(tbl => {
                        tbl.style.width = `${totalWidth}px`;
                        tbl.style.minWidth = `${totalWidth}px`;
                        tbl.style.maxWidth = `${totalWidth}px`;

                        Object.entries(colWidths).forEach(([colIdx, w]) => {
                            tbl.querySelectorAll(`th[data-col="${colIdx}"], td[data-col="${colIdx}"]`).forEach(cell => {
                                //cell.style.width = `${w}px`;
                                //cell.style.minWidth = `${w}px`;
                                //cell.style.maxWidth = `${w}px`;
                            });
                        });
                    });
                }
            });
        } else {
            containers.forEach(container => {
                const tables = container.querySelectorAll('table');
                tables.forEach(tbl => {
                    //tbl.style.width = '100%';
                    //tbl.style.minWidth = '100%';
                    //tbl.style.maxWidth = '';
                });
            });
        }

        this.#sheet.querySelector('nine-table-hscrollbar')?.refresh();
    }

    setColumnWidth(globalColIndex, width, containerType = null) {

        let targetCols = [];

        targetCols = Array.from(this.#sheet.querySelectorAll(`table colgroup col[data-col="${globalColIndex}"]`));

        if (targetCols.length === 0) return;

        const firstContainer = targetCols[0].closest('.ng-container-left, .ng-container-body, .ng-container-right');
        const resolvedContainerType = containerType || (
            firstContainer?.classList.contains('ng-container-left') ? 'left' :
                firstContainer?.classList.contains('ng-container-right') ? 'right' : 'body'
        );

        targetCols.forEach(col => {
            col.setAttribute('width', width);
            col.style.width = col.style.minWidth = col.style.maxWidth = `${width}px`;
        });

        const sourceCol = this.#sheet.sourceTable?.querySelector(`colgroup col[data-col="${globalColIndex}"]`);
        if (sourceCol) {
            sourceCol.setAttribute('width', width);
            sourceCol.style.width = sourceCol.style.minWidth = sourceCol.style.maxWidth  = `${width}px`;
        }

        this.refreshLayout(resolvedContainerType);

        if (resolvedContainerType === 'left' || resolvedContainerType === 'right') {
            this.refreshLayout('body');
        }

        this.#sheet.rowManager?.refresh();
    }

    #checkIsAutoFit(targetCell) {
        if (this.#sheet.isAutoFitCol) return true;
        const table = targetCell?.closest('table');
        if (table && table.getAttribute('auto-fit-col') === 'true') return true;
        return false;
    }

    bindEvents() {
        this.#sheet.addEventListener('pointermove', this.#onPointerMove);
        //this.#sheet.addEventListener('pointerdown', this.#onPointerDown);
        //this.#sheet.addEventListener('dblclick', this.#onDblClick);

        this.#sheet.addDebounseEventListener('dblclick', this.#onDblClick, 'pointerdown', this.#onPointerDown);
    }

    #getContainerType(cell) {
        const container = cell.closest('.ng-container-left, .ng-container-body, .ng-container-right');
        if (!container) return null;
        if (container.classList.contains('ng-container-left')) return 'left';
        if (container.classList.contains('ng-container-right')) return 'right';
        return 'body';
    }

    #onPointerMove = (e) => {


        const headerPart = e.target.closest('thead');
        if (!headerPart) return;

        const cell = e.target.closest('th, td');

        headerPart.querySelectorAll('.resizable-edge').forEach(el => {
            if (el !== cell) el.classList.remove('resizable-edge');
        });

        if (!cell || cell.dataset.col === undefined) return;
        if (cell.getAttribute('collapsed') === 'true') return;

        const rect = cell.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const isLeftEdge = offsetX <= RESIZE_OFFSET;
        const isRightEdge = (rect.width - offsetX) <= RESIZE_OFFSET;

        if (isLeftEdge) {
            const prevCell = cell.previousElementSibling;
            if (!prevCell || prevCell.getAttribute('collapsed') === 'true') {
                cell.classList.remove('resizable-edge');
                return;
            }
        }

        if (isLeftEdge || isRightEdge) {
            cell.classList.add('resizable-edge');
        } else {
            cell.classList.remove('resizable-edge');
        }
    };

    #onPointerDown = (e) => {

        const headerPart = e.actualTarget.closest('thead');
        if (!headerPart) return;

        const cell = e.actualTarget.closest('th, td');

        if (!cell || !cell.classList.contains('resizable-edge')) return;



        e.preventDefault();
        const rect = cell.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;

        let targetCell = cell;

        if (offsetX <= RESIZE_OFFSET) {
            const prevCell = cell.previousElementSibling;
            if (prevCell && prevCell.dataset.col !== undefined && prevCell.getAttribute('collapsed') !== 'true') {
                targetCell = prevCell;
            } else if (!cell.previousElementSibling) {
                return;
            }
        }

        this.#targetCell = targetCell;
        this.#targetContainerType = this.#getContainerType(targetCell);

        const container = this.#sheet.querySelector(`.ng-container-${this.#targetContainerType}`);
        if (!container) return;

        const baseColIndex = parseInt(targetCell.dataset.col, 10);
        const colSpan = targetCell.colSpan || 1;
        this.#targetColIndex = baseColIndex + colSpan - 1;

        const isAutoFit = this.#checkIsAutoFit(targetCell);
        if (isAutoFit) {
            this.#nextColIndex = this.#targetColIndex + 1;
            const nextColEl = container.querySelector(`col[data-col="${this.#nextColIndex}"]`);
            if (nextColEl) {
                this.#nextColStartWidth = parseInt(nextColEl.getAttribute('width'), 10) || 100;
            } else {
                this.#nextColIndex = null;
            }
        } else {
            this.#nextColIndex = null;
        }

        const targetRect = targetCell.getBoundingClientRect();
        const sheetRect = this.#sheet.getBoundingClientRect();

        this.#startCellWidth = targetRect.width;
        this.#startLeft = targetRect.left - sheetRect.left;

        const targetColEl = container.querySelector(`col[data-col="${this.#targetColIndex}"]`);
        const attrW = targetColEl?.getAttribute('width');
        this.#startColWidth = (attrW && !isNaN(parseInt(attrW, 10))) ? parseInt(attrW, 10) : targetRect.width / colSpan;

        this.#startX = e.clientX;

        if (this.#panel) {
            this.#panel.classList.add('active');
            this.#updatePositions(e.clientX);
        }

        window.addEventListener('pointermove', this.#onDragMove);
        window.addEventListener('pointerup', this.#onDragEnd, { once: true });
    };

    #updatePositions(clientX) {
        let diff = clientX - this.#startX;
        const isAutoFit = this.#checkIsAutoFit(this.#targetCell);

        if (isAutoFit && this.#nextColIndex !== null) {
            const maxDiff = this.#nextColStartWidth - COLLAPSED_WIDTH;
            const minDiff = -(this.#startColWidth - COLLAPSED_WIDTH);
            diff = Math.max(minDiff, Math.min(diff, maxDiff));
        }

        const currentColWidth = Math.max(COLLAPSED_WIDTH, this.#startColWidth + diff);

        const targetRect = this.#targetCell.getBoundingClientRect();
        let realCellWidth = clientX - targetRect.left;

        if (isAutoFit && this.#nextColIndex !== null) {
            const maxCellWidth = this.#startCellWidth + (this.#nextColStartWidth - COLLAPSED_WIDTH);
            realCellWidth = Math.min(realCellWidth, maxCellWidth);
        }

        const currentCellWidth = Math.max(COLLAPSED_WIDTH, realCellWidth);

        if (this.#panel) {
            this.#panel.style.setProperty('--col-resizer-tooltip-left', `${this.#startLeft}px`);
            this.#panel.style.setProperty('--col-resizer-tooltip-width', `${currentCellWidth}px`);
        }

        const sizeBadge = this.#tooltip?.querySelector('.size-badge');
        if (sizeBadge) {
            sizeBadge.textContent = `${Math.round(currentColWidth)}px`;
        }
    }

    #onDragMove = (e) => {
        this.#updatePositions(e.clientX);
    };

    #onDragEnd = (e) => {
        window.removeEventListener('pointermove', this.#onDragMove);

        const diff = e.clientX - this.#startX;
        const isAutoFit = this.#checkIsAutoFit(this.#targetCell);
        let finalWidth = 0;

        if (isAutoFit && this.#nextColIndex !== null) {
            let newColWidth = Math.max(COLLAPSED_WIDTH, this.#startColWidth + diff);
            let newNextWidth = this.#startColWidth + this.#nextColStartWidth - newColWidth;

            if (newNextWidth < COLLAPSED_WIDTH) {
                newNextWidth = COLLAPSED_WIDTH;
                newColWidth = this.#startColWidth + this.#nextColStartWidth - COLLAPSED_WIDTH;
            }

            this.setColumnWidth(this.#targetColIndex, newColWidth, this.#targetContainerType);
            this.setColumnWidth(this.#nextColIndex, newNextWidth, this.#targetContainerType);
            finalWidth = newColWidth;
        } else {
            const newColWidth = Math.max(COLLAPSED_WIDTH, this.#startColWidth + diff);
            if (this.#targetColIndex !== null && this.#targetContainerType) {
                this.setColumnWidth(this.#targetColIndex, newColWidth, this.#targetContainerType);
                finalWidth = newColWidth;
            }
        }

        if (this.#targetCell) {
            const targetCell = this.#targetCell;
            if (targetCell.getAttribute('collapsed') !== 'true' && finalWidth > 20) {
                targetCell.dataset.expandWidth = String(finalWidth);
            }
        }

        if (this.#panel) {
            this.#tooltip?.classList.add('fade-out');
            setTimeout(() => {
                this.#panel.classList.remove('active');
                this.#tooltip?.classList.remove('fade-out');
            }, 150);
        }

        this.#targetColIndex = null;
        this.#nextColIndex = null;
        this.#targetContainerType = null;
        this.#targetCell = null;
    };

    #onDblClick = (e) => {

        const targetEl = e.target;
        let cell = targetEl.closest('th, td');
        if (!cell || !cell.classList.contains('resizable-edge')) return;

        const rect = cell.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;

        if (offsetX <= RESIZE_OFFSET) {
            cell = cell.previousElementSibling;
        }

        const baseColIndex = parseInt(cell.dataset.col, 10);
        const tbodyCell = this.#sheet.querySelector(`tbody.body [data-col="${baseColIndex}"]`);
        if (!tbodyCell || !tbodyCell.dataset.bind || tbodyCell.classList.contains("CELL-RADIO")) return;

        let extraPadding = 0;
        Array.from(tbodyCell.firstElementChild.children).forEach(($el) => {
            switch ($el.tagName) {
                case 'SPAN': extraPadding += 8; break;
                case 'DIV': extraPadding += 8; break;
                case 'BUTTON': extraPadding += 32; break;
                case 'SELECT': extraPadding += 32; break;
                case 'INPUT':
                    switch (($el.type || 'text').toLowerCase()) {
                        // 1. 체크박스 / 라디오 (비교적 좁은 영역)
                        case 'checkbox':
                        case 'radio':
                            extraPadding += 12;
                            break;

                        // 2. 버튼 계열 input
                        case 'button':
                        case 'submit':
                        case 'reset':
                        case 'image':
                            extraPadding += 16;
                            break;

                        // 3. 특수 위젯 (컬러, 파일, 슬라이더)
                        case 'color':
                        case 'file':
                        case 'range':
                            extraPadding += 24;
                            break;

                        // 4. 화면에 안 보이는 hidden 필드
                        case 'hidden':
                            extraPadding += 0;
                            break;

                        // 5. 텍스트 및 숫자, 날짜 등 일반 입력 필드 (기본값)
                        case 'text':
                        case 'search':
                        case 'tel':
                        case 'url':
                        case 'email':
                        case 'password':
                        case 'number':
                        case 'date':
                        case 'time':
                        case 'datetime-local':
                        case 'month':
                        case 'week':
                        default:
                            extraPadding += 16;
                            break;
                    }
                    break;
            }
        });

        const fieldIdx = this.#host.fields.get().indexOf(tbodyCell.dataset.bind);

        const computedStyle = window.getComputedStyle(tbodyCell);
        const font = computedStyle.font || '12px sans-serif';

        const headerText = cell.innerText || "";
        const headerSize = nine.measureTextSize(headerText, font);
        let maxTextWidth = (headerSize.width || 0) + 16;

        this.#host.execute(() => {

            this.#sheet.view.getArray().forEach((record, idx) => {
                const val = String(tbodyCell.dataset.expr ? this.#host.exprEngine.evaluate(tbodyCell.dataset.expr, record, idx) : record.v[fieldIdx] ?? "").trim();
                const size = nine.measureTextSize(val, font);
                if (size.width && size.width > maxTextWidth) {
                    maxTextWidth = size.width;
                }
            });

            const calculatedWidth = Math.max(32, Math.min(400, Math.ceil(maxTextWidth) + extraPadding));

            this.setColumnWidth(tbodyCell.dataset.col, calculatedWidth, this.#getContainerType(cell));
        })
    };
}


export class ColResizerPanel extends HTMLElement {
    #target;

    constructor() {
        super();
    }

    connectedCallback() {

        this.#renderer();
    }

    #renderer = () => {
        this.innerHTML = `
            <div class="resizer-overlay">
                <span class="size-badge">0px</span>
            </div>
        `;
    };
}

if (!customElements.get('nine-table-col-resizer-panel')) {
    customElements.define("nine-table-col-resizer-panel", ColResizerPanel);
}
