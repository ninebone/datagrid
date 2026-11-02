// ui/col/ColMover.js
import { trace } from "@nopeer";
import { TableCompiler } from "@/layout/core/TableCompiler.js";

export class ColMover {
    #sheet;
    #grip;
    #indi;

    #isDragging = false;
    #sourceCell = null;
    #sourceColIndex = null;
    #targetColIndex = null;
    #shiftX = 0;
    #timer = null;

    constructor(sheet) {
        this.#sheet = sheet;
        this.#grip = this.#sheet.querySelector('.ng-col-mover-grip');
        this.#indi = this.#sheet.querySelector('.ng-col-mover-indi');
        this.bindEvents();
    }

    bindEvents() {
        this.#sheet.addEventListener('pointerdown', this.#onPointerDown);
    }

    #checkIsMovable() {
        const host = this.#sheet.getRootNode()?.host;
        return this.#sheet.getAttribute('col-movable') === 'true' || host?.getAttribute('col-movable') === 'true';
    }

    #getDeepElementFromPoint(x, y) {
        const root = this.#sheet.getRootNode();
        let el = root.elementFromPoint ? root.elementFromPoint(x, y) : document.elementFromPoint(x, y);

        while (el && el.shadowRoot && el.shadowRoot.elementFromPoint) {
            const nested = el.shadowRoot.elementFromPoint(x, y);
            if (!nested || nested === el) break;
            el = nested;
        }

        return el;
    }

    #getColGroupRange(cell) {
        if (!cell || cell.dataset.col === undefined) return null;

        const startCol = parseInt(cell.dataset.col, 10);
        const colSpan = cell.colSpan || 1;
        const endCol = startCol + colSpan - 1;
        const rowIndex = cell.closest('tr')?.sectionRowIndex ?? 0;

        const table = cell.closest('table');
        if (!table) return { startCol, colSpan, endCol, rowIndex, isGroup: false, parentGroupRange: null, isValidGroup: true };

        const headerCells = table.querySelectorAll('thead th, thead td');
        let hasStrictChildren = false;
        let isValidGroup = true;
        let parentGroupRange = null;

        for (const subCell of headerCells) {
            if (subCell === cell || subCell.dataset.col === undefined) continue;

            const subStart = parseInt(subCell.dataset.col, 10);
            const subSpan = subCell.colSpan || 1;
            const subEnd = subStart + subSpan - 1;
            const subRowIndex = subCell.closest('tr')?.sectionRowIndex ?? 0;

            if (subRowIndex < rowIndex && subStart <= startCol && subEnd >= endCol && subSpan > colSpan) {
                if (!parentGroupRange) {
                    parentGroupRange = { startCol: subStart, endCol: subEnd };
                } else {
                    parentGroupRange.startCol = Math.max(parentGroupRange.startCol, subStart);
                    parentGroupRange.endCol = Math.min(parentGroupRange.endCol, subEnd);
                }
            }

            const isOverlap = !(subEnd < startCol || subStart > endCol);
            if (isOverlap) {
                const isFullyContained = (subStart >= startCol && subEnd <= endCol);

                if (isFullyContained) {
                    if (subSpan < colSpan) {
                        hasStrictChildren = true;
                    }
                } else if (subStart < startCol || subEnd > endCol) {
                    if (!(subStart <= startCol && subEnd >= endCol)) {
                        isValidGroup = false;
                    }
                }
            }
        }

        const isRealGroup = hasStrictChildren && isValidGroup;

        return {
            startCol,
            colSpan: isRealGroup ? colSpan : 1,
            endCol: isRealGroup ? endCol : startCol,
            rowIndex,
            isGroup: isRealGroup,
            parentGroupRange,
            isValidGroup
        };
    }

    #createGroupHeaderPreview(cell) {
        const groupRange = this.#getColGroupRange(cell);
        if (!groupRange) return null;

        const { startCol, endCol, isGroup } = groupRange;

        // 핵심: 테이블이 여러 개인 구조이므로 cell이 속한 바로 그 테이블을 직접 가져옵니다.
        const origTable = cell.closest('table');
        if (!origTable) return null;

        let minLeft = Infinity, maxRight = -Infinity, minTop = Infinity, maxBottom = -Infinity;
        const targetCells = [];

        origTable.querySelectorAll('thead th, thead td').forEach(c => {
            if (c.dataset.col === undefined) return;
            const cCol = parseInt(c.dataset.col, 10);
            const cSpan = c.colSpan || 1;
            const cEnd = cCol + cSpan - 1;

            const isTarget = isGroup
                ? (cCol >= startCol && cEnd <= endCol)
                : (c === cell);

            if (isTarget) {
                const rect = c.getBoundingClientRect();
                minLeft = Math.min(minLeft, rect.left);
                maxRight = Math.max(maxRight, rect.right);
                minTop = Math.min(minTop, rect.top);
                maxBottom = Math.max(maxBottom, rect.bottom);

                const computedStyle = window.getComputedStyle(c);
                targetCells.push({ el: c, rect, style: computedStyle });
            }
        });

        if (targetCells.length === 0) return null;

        const groupWidth = maxRight - minLeft;
        const groupHeight = maxBottom - minTop;

        const headerContent = document.createElement('div');
        headerContent.className = 'grip-header-content';
        headerContent.style.position = 'relative';
        headerContent.style.width = `${groupWidth}px`;
        headerContent.style.height = `${groupHeight}px`;

        targetCells.forEach(({ el, rect, style }) => {
            const clonedCell = el.cloneNode(true);

            clonedCell.style.position = 'absolute';
            clonedCell.style.left = `${rect.left - minLeft}px`;
            clonedCell.style.top = `${rect.top - minTop}px`;

            clonedCell.style.width = `${rect.width}px`;
            clonedCell.style.minWidth = `${rect.width}px`;
            clonedCell.style.maxWidth = 'none';

            clonedCell.style.height = `${rect.height}px`;
            clonedCell.style.boxSizing = 'border-box';
            clonedCell.style.margin = '0';

            clonedCell.style.backgroundColor = style.backgroundColor !== 'transparent' && style.backgroundColor !== 'rgba(0, 0, 0, 0)'
                ? style.backgroundColor
                : '#f9fafb';
            clonedCell.style.color = style.color;
            clonedCell.style.font = style.font;
            clonedCell.style.fontWeight = style.fontWeight;
            clonedCell.style.fontSize = style.fontSize;
            clonedCell.style.textAlign = style.textAlign;
            clonedCell.style.padding = style.padding;
            clonedCell.style.border = style.border;
            clonedCell.style.borderRight = style.borderRight;
            clonedCell.style.borderBottom = style.borderBottom;
            clonedCell.style.display = 'flex';
            clonedCell.style.alignItems = 'center';
            clonedCell.style.justifyContent = style.textAlign === 'center' ? 'center' : (style.textAlign === 'right' ? 'flex-end' : 'flex-start');

            headerContent.appendChild(clonedCell);
        });

        return {
            element: headerContent,
            bounds: {
                left: minLeft,
                right: maxRight,
                top: minTop,
                bottom: maxBottom,
                width: groupWidth,
                height: groupHeight
            }
        };
    }

    #onPointerDown = (e) => {
        if (!this.#checkIsMovable()) return;

        const headerPart = e.target.closest('.ng-sheet-header');
        if (!headerPart) return;

        const cell = e.target.closest('th, td');
        if (!cell || cell.classList.contains('resizable-edge') || ['INPUT', 'BUTTON'].includes(e.target.tagName)) return;
        if (cell.dataset.col === undefined) return;

        e.preventDefault();

        const startX = e.clientX;
        const startY = e.clientY;

        const cancelTimer = () => {
            if (this.#timer) {
                clearTimeout(this.#timer);
                this.#timer = null;
            }
            window.removeEventListener('pointermove', onPointerMovePending);
            window.removeEventListener('pointerup', cancelTimer);
            window.removeEventListener('pointercancel', cancelTimer);
        };

        const onPointerMovePending = (moveEvent) => {
            const dist = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
            if (dist > 5) {
                cancelTimer();
            }
        };

        this.#timer = setTimeout(() => {
            cancelTimer();
            this.#startDrag(e, cell);
        }, 500);

        window.addEventListener('pointermove', onPointerMovePending);
        window.addEventListener('pointerup', cancelTimer, { once: true });
        window.addEventListener('pointercancel', cancelTimer, { once: true });
    };

    #startDrag(e, cell) {
        if (this.#isDragging) return;

        const preview = this.#createGroupHeaderPreview(cell);
        if (!preview) return;

        this.#isDragging = true;
        this.#sourceCell = cell;
        this.#sourceColIndex = parseInt(cell.dataset.col, 10);

        const sheetRect = this.#sheet.getBoundingClientRect();
        const { bounds, element } = preview;

        this.#shiftX = e.clientX - bounds.left;

        if (this.#grip) {
            this.#grip.replaceChildren(element);

            const relativeTop = bounds.top - sheetRect.top;
            const fullHeight = sheetRect.height - relativeTop;

            this.#grip.style.width = `${bounds.width}px`;
            this.#grip.style.height = `${fullHeight}px`;
            this.#grip.style.top = `${relativeTop}px`;
            this.#grip.style.display = 'block';

            this.#updateGripPosition(e.clientX);
        }

        document.body.style.cursor = 'move';

        window.addEventListener('pointermove', this.#onPointerMove);
        window.addEventListener('pointerup', this.#onPointerUp, { once: true });
    }

    #onPointerMove = (e) => {
        if (!this.#isDragging) return;

        this.#updateGripPosition(e.clientX);

        if (this.#grip) this.#grip.style.pointerEvents = 'none';
        if (this.#indi) this.#indi.style.pointerEvents = 'none';

        const targetElement = this.#getDeepElementFromPoint(e.clientX, e.clientY);
        const targetCell = targetElement?.closest('.ng-sheet-header th, .ng-sheet-header td');

        if (targetCell && targetCell.dataset.col !== undefined) {
            const targetColIndex = parseInt(targetCell.dataset.col, 10);
            const sheetRect = this.#sheet.getBoundingClientRect();
            const table = targetCell.closest('table');

            let colMinLeft = Infinity;
            let colMaxRight = -Infinity;

            if (table) {
                table.querySelectorAll('thead th, thead td').forEach(c => {
                    if (c.dataset.col === undefined) return;
                    const cCol = parseInt(c.dataset.col, 10);
                    const cSpan = c.colSpan || 1;
                    const cEnd = cCol + cSpan - 1;

                    if (cCol <= targetColIndex && cEnd >= targetColIndex) {
                        const cRect = c.getBoundingClientRect();
                        colMinLeft = Math.min(colMinLeft, cRect.left);
                        colMaxRight = Math.max(colMaxRight, cRect.right);
                    }
                });
            }

            if (colMinLeft === Infinity) {
                const rect = targetCell.getBoundingClientRect();
                colMinLeft = rect.left;
                colMaxRight = rect.right;
            }

            const midX = colMinLeft + ((colMaxRight - colMinLeft) / 2);
            let calculatedTargetCol = 0;
            let indicatorLeft = 0;

            if (e.clientX < midX) {
                calculatedTargetCol = targetColIndex;
                indicatorLeft = colMinLeft - sheetRect.left;
            } else {
                const colSpan = targetCell.colSpan || 1;
                calculatedTargetCol = targetColIndex + colSpan;
                indicatorLeft = colMaxRight - sheetRect.left;
            }

            const sourceGroup = this.#getColGroupRange(this.#sourceCell);
            const movingSpan = sourceGroup.colSpan;

            const sourceRowStart = sourceGroup.rowIndex;
            const sourceRowSpan = this.#sourceCell.rowSpan || 1;
            const sourceRowEnd = sourceRowStart + sourceRowSpan - 1;

            const targetRowStart = targetCell.closest('tr')?.sectionRowIndex ?? 0;
            const targetRowSpan = targetCell.rowSpan || 1;
            const targetRowEnd = targetRowStart + targetRowSpan - 1;

            const isRowSpanCompatible = !(sourceRowEnd < targetRowStart || sourceRowStart > targetRowEnd);

            let isOutOfBoundsOfParent = false;
            if (sourceGroup.parentGroupRange) {
                const { startCol: pStart, endCol: pEnd } = sourceGroup.parentGroupRange;
                if (calculatedTargetCol < pStart || (calculatedTargetCol + movingSpan - 1) > pEnd) {
                    isOutOfBoundsOfParent = true;
                }
            }

            let isDroppingInsideOtherGroup = false;
            if (table) {
                const spannedCells = table.querySelectorAll('thead th[colspan], thead td[colspan]');

                for (const sCell of spannedCells) {
                    if (sCell === this.#sourceCell) continue;

                    const sRowStart = sCell.closest('tr')?.sectionRowIndex ?? 0;
                    const sRowSpan = sCell.rowSpan || 1;
                    const sRowEnd = sRowStart + sRowSpan - 1;

                    const isVerticalOverlap = !(sourceRowEnd < sRowStart || sourceRowStart > sRowEnd);
                    if (!isVerticalOverlap) continue;

                    const sStart = parseInt(sCell.dataset.col, 10);
                    const sSpan = sCell.colSpan || 1;
                    const sEnd = sStart + sSpan - 1;

                    if (calculatedTargetCol > sStart && calculatedTargetCol < sEnd + 1) {
                        isDroppingInsideOtherGroup = true;
                        break;
                    }

                    const moveEndCol = calculatedTargetCol + movingSpan - 1;
                    const isCrossIntersecting = (
                        (calculatedTargetCol > sStart && calculatedTargetCol <= sEnd && moveEndCol > sEnd) ||
                        (calculatedTargetCol < sStart && moveEndCol >= sStart && moveEndCol < sEnd)
                    );

                    if (isCrossIntersecting) {
                        isDroppingInsideOtherGroup = true;
                        break;
                    }
                }
            }

            const isSelfGroup = (
                calculatedTargetCol >= sourceGroup.startCol &&
                calculatedTargetCol <= sourceGroup.endCol + 1
            );

            const isInvalidMove = !isRowSpanCompatible || isSelfGroup || isOutOfBoundsOfParent || isDroppingInsideOtherGroup || !sourceGroup.isValidGroup;

            if (isInvalidMove) {
                this.#targetColIndex = null;
                if (this.#indi) this.#indi.style.display = 'none';
                if (this.#grip) this.#grip.classList.add('invalid');
            } else {
                this.#targetColIndex = calculatedTargetCol;
                if (this.#grip) this.#grip.classList.remove('invalid');

                if (this.#indi) {
                    const headerPart = targetCell.closest('.ng-sheet-header');
                    const headerRect = headerPart.getBoundingClientRect();
                    const relativeTop = headerRect.top - sheetRect.top;
                    const fullHeight = sheetRect.height - relativeTop;

                    this.#indi.style.top = `${relativeTop}px`;
                    this.#indi.style.height = `${fullHeight}px`;
                    this.#indi.style.left = `${indicatorLeft - 1}px`;
                    this.#indi.style.display = 'block';
                }
            }
        } else {
            if (this.#indi) this.#indi.style.display = 'none';
            if (this.#grip) this.#grip.classList.add('invalid');
            this.#targetColIndex = null;
        }
    };

    #updateGripPosition(clientX) {
        if (!this.#grip) return;
        const sheetRect = this.#sheet.getBoundingClientRect();
        const left = clientX - sheetRect.left - this.#shiftX;
        this.#grip.style.left = `${left}px`;
    }

    #onPointerUp = (e) => {
        if (!this.#isDragging) return;

        window.removeEventListener('pointermove', this.#onPointerMove);
        document.body.style.cursor = '';

        if (this.#grip) {
            this.#grip.style.display = 'none';
            this.#grip.replaceChildren();
        }
        if (this.#indi) this.#indi.style.display = 'none';

        if (
            this.#targetColIndex !== null &&
            this.#sourceColIndex !== null &&
            this.#targetColIndex !== this.#sourceColIndex &&
            this.#targetColIndex !== this.#sourceColIndex + 1
        ) {
            this.moveColumn(this.#sourceColIndex, this.#targetColIndex);
        }

        this.#isDragging = false;
        this.#sourceCell = null;
        this.#sourceColIndex = null;
        this.#targetColIndex = null;
    };

    moveColumn(fromColIndex, toColIndex) {

        trace.log(this.#sheet.sourceTable.cloneNode(true));

        const colgroup = this.#sheet.sourceTable.querySelector('colgroup');
        const targetCol = colgroup.querySelector(`col[data-col="${toColIndex}"]`);

        const sourceGroup = this.#getColGroupRange(this.#sourceCell);
        if (!sourceGroup || !sourceGroup.isValidGroup) return;

        const spanCount = sourceGroup.colSpan;
        const isInRange = (idx) => idx >= fromColIndex && idx < fromColIndex + spanCount;

        // 1. colgroup 내 <col> 이동 및 fixed 설정
        const targetViewportCol = this.#sheet.querySelector(`.ng-sheet-body-content col[data-col="${toColIndex}"]`);
        const fixedType = targetViewportCol?.closest('.ng-container-left') ? 'left' : targetViewportCol?.closest('.ng-container-right') ? 'right' : null;

        colgroup.querySelectorAll('col').forEach(col => {
            if (isInRange(parseInt(col.getAttribute('data-col'), 10))) {
                fixedType ? col.setAttribute('fixed', fixedType) : col.removeAttribute('fixed');
                colgroup.insertBefore(col, targetCol);
            }
        });

        // 2. 테이블 행(tr) 내부의 셀(th, td) 순서 동기화
        ['thead', 'tbody', 'tfoot'].forEach(group => {
            this.#sheet.sourceTable.querySelectorAll(`${group} tr`).forEach(tr => {
                const cells = Array.from(tr.children);
                const targetRowCell = cells.find(c => parseInt(c.dataset.col, 10) >= toColIndex);

                cells.forEach(cell => {
                    if (isInRange(parseInt(cell.dataset.col, 10))) {
                        tr.insertBefore(cell, targetRowCell || null);
                    }
                });
            });
        });

        this.#sheet.recompileAndRefresh();
    }

    destroy() {
        this.#sheet.removeEventListener('pointerdown', this.#onPointerDown);
    }
}