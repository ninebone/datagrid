import { trace } from "@nopeer";
import './nine-table-hscrollbar.js';
import './nine-table-vscrollbar.js';
import { RowManager } from './core/RowManager.js';
import { TableCompiler } from "./core/TableCompiler.js";
import { CellSelection } from "@/cell-manager/CellSelection.js";
import { CellNavigation } from "@/cell-manager/CellNavigation.js";

import { ColResizer } from "@/col/ColResizer.js";
import { ColMover } from "@/col/ColMover.js";
import { ColFixManager } from "@/col/ColFixManager.js";

import { Filtering } from "@/data/Filtering.js";
import { GroupingManager } from "@/data/Grouping.js";
import { Sorting } from "@/data/Sorting.js";
import { SheetView } from "@/data/SheetView.js";

import { PreCompiler } from "@/layout/core/PreCompiler.js";
import { SheetAPI } from "@/api/SheetAPI.js";

export class NineTableSheet extends HTMLElement {
    #index;
    #host;
    #rowManager;
    #cellSelection;
    #cellNavigation;
    #colResizer;
    #colMover;
    #colFix;
    #sorting;
    #filtering;
    #grouping;
    #api;

    #view;

    #source = {
        table: null,
    };

    #elements;

    #template = {
        length: 0,
        height: 0,
        heights: [],
    };

    static SCROLLBAR_SIZE = 16;

    constructor() {
        super();

        this.#host = this.getRootNode().host;
        this.#rowManager = new RowManager(this);

        this.#api = new SheetAPI(this);

        this.#bindApiMethods();
    }

    connectedCallback() {
        this.#init();
    }

    get template() { return this.#template; }
    get index() { return this.#index; }
    get colResizer() { return this.#colResizer; }
    get filtering() { return this.#filtering; }
    get grouping() { return this.#grouping; }
    get colMover() { return this.#colMover; }
    get colFix() { return this.#colFix; }
    get rowManager() { return this.#rowManager; }
    get selection() { return this.#cellSelection; }
    get navigation() { return this.#cellNavigation; }
    get templateLength() { return this.#source.tbody.tr.length || 0; }

    get elements() { return this.#elements; }

    /**
    get template() {
        return {
            length: this.#source?.tbody?.tr?.length || 0,
            trs: this.#source?.tbody?.tr || []
        };
    } */

    get isAutoFitCol() {
        const attrTrue = this.getAttribute('auto-fit-col') === 'true' || this.#host?.getAttribute('auto-fit-col') === 'true';
        const sourceTableTrue = this.#source.table?.getAttribute('auto-fit-col') === 'true';
        return attrTrue || sourceTableTrue;
    }

    get sourceTable() {
        return this.#source.table;
    }

    get source() {
        return this.#source;
    }

    get #isSimple() {
        return this.#host.hasAttribute('simple') || this.#host.getAttribute('theme') === 'simple';
    }

    scrollTo = (dataRow, callback) => {
        this.rowManager.scrollToDataRow(dataRow, 'top', callback);
    }

    recompileAndRefresh() {
        if (!this.#source.table) return;

        TableCompiler.recompile(this.#source.table);

        ['left', 'right', 'body'].forEach(type => {
            ['header', 'body', 'footer'].forEach(section => {
                const container = this.querySelector(`.ng-sheet-${section} .ng-container-${type}`);
                if (!container) return;
                container.querySelectorAll('table').forEach(tbl => tbl.remove());
            });
        });

        this.#renderSplitContainers();

        this.#updateContainerWidths();

        this.#rowManager.initialize();

        if (this.isAutoFitCol) {
            this.autoFit(true);
        } else {
            this.querySelector('nine-table-hscrollbar')?.refresh();
        }

        requestAnimationFrame(() => {
            this.#updateContainerWidths();
            this.#rowManager?.refresh();
        });
    }

    refreshLayout() {

        requestAnimationFrame(() => {

            if (!this.classList.contains('active') || !this.#source.table) return;

            this.#updateContainerWidths();

            if (this.isAutoFitCol) {
                this.autoFit(true);
            } else {
                this.querySelector('nine-table-hscrollbar')?.refresh();
            }

            this.#adjustOverlay();

            this.#colResizer?.refreshLayout();

            this.#rowManager?.refresh();
        });
    }

    #adjustOverlay = () => {
        const $thead = this.querySelector('.ng-container-body thead');
        const $overlay = this.querySelector('.nodata-overlay');
        $overlay.style.top = `${$thead?.offsetHeight}px`;
    }

    get view() {
        if (!this.#view && this.#host?.data) {
            this.#view = new SheetView(this);
        }
        return this.#view;
    }

    invalidate = () => {

        this.view.refresh();

        this.#rowManager.refresh(true);

        if (this.isAutoFitCol) {
            this.autoFit(true);
        }
    };

    autoFit = (enable = true) => {
        requestAnimationFrame(() => {
            this.#autoFit?.(enable);
        });
    };

    #autoFit = (enable = true) => {

        const container = this.querySelector('.ng-sheet-body .ng-container-body');
        if (!container) return;

        const firstColgroup = this.querySelector('.ng-container-body table colgroup');
        if (!firstColgroup) return;

        if (enable) {
            this.setAttribute('auto-fit-col', 'true');
            const containerWidth = container.clientWidth;
            if (containerWidth <= 0) return;

            let totalOriginalWidth = 0;
            const colList = [];

            firstColgroup.querySelectorAll('col').forEach(col => {
                const globalColIndex = col.getAttribute('data-col');
                const headerCell = this.querySelector(`thead th[data-col="${globalColIndex}"]`);
                const isCollapsed = headerCell?.getAttribute('collapsed') === 'true';

                if (isCollapsed) {
                    colList.unshift({ globalColIndex, width: 16, isCollapsed: true });
                } else {
                    const w = parseInt(col.getAttribute('width'), 10) || 100;
                    colList.push({ globalColIndex, width: w, isCollapsed: false });
                    totalOriginalWidth += w;
                }
            });

            const collapsedTotalWidth = colList
                .filter(c => c.isCollapsed)
                .reduce((sum, c) => sum + c.width, 0);

            const availableWidth = Math.max(0, containerWidth - collapsedTotalWidth);

            if (totalOriginalWidth > 0 && colList.length > 0) {
                let allocatedTotal = 0;

                const calculatedCols = colList.map(item => {
                    if (item.isCollapsed) {
                        return { globalColIndex: item.globalColIndex, remainder: 0, width: 16 };
                    }

                    const exactWidth = (item.width * availableWidth) / totalOriginalWidth;
                    const baseWidth = Math.max(30, Math.floor(exactWidth));
                    allocatedTotal += baseWidth;
                    return {
                        globalColIndex: item.globalColIndex,
                        remainder: exactWidth - Math.floor(exactWidth),
                        width: baseWidth
                    };
                });

                let remainderPixels = availableWidth - allocatedTotal;

                const uncollapsedCols = calculatedCols.filter(c => !colList.find(item => item.globalColIndex === c.globalColIndex)?.isCollapsed);

                if (remainderPixels > 0 && uncollapsedCols.length > 0) {
                    uncollapsedCols.sort((a, b) => b.remainder - a.remainder);
                    for (let i = 0; i < remainderPixels; i++) {
                        uncollapsedCols[i % uncollapsedCols.length].width += 1;
                    }
                } else if (remainderPixels < 0 && uncollapsedCols.length > 0) {
                    uncollapsedCols.sort((a, b) => a.remainder - b.remainder);
                    for (let i = 0; i < Math.abs(remainderPixels); i++) {
                        const target = uncollapsedCols[i % uncollapsedCols.length];
                        if (target.width > 30) target.width -= 1;
                    }
                }

                calculatedCols.forEach(({ globalColIndex, width }) => {
                    this.#colResizer?.setColumnWidth(globalColIndex, width, 'body');
                });
            }
        } else {
            this.removeAttribute('auto-fit-col');
        }

        this.querySelector('nine-table-hscrollbar')?.refresh();
    }

    generateTemplate = ($table, index) => {

        const activeParent = (v) => {

            if (['NINE-TABLE-SIMPLE'].includes(this.#host.tagName)) {
                const $parent = this.#host.closest("nine-table-filter-panel, cell-combo-panel");
                if ($parent) {
                    v ? $parent.classList.add('active') : $parent.classList.remove('active');
                }
            }
        };

        activeParent(true);

        this.#index = index;

        this.#source = {
            table: TableCompiler.compile($table),
            tbody: {
                tr: $table.querySelectorAll("tbody tr"),
            }
        };

        this.querySelector(`.ng-container-body`).appendChild(this.#source.table);

        this.#template.height = this.#template.length = 0;
        this.#template.heights = [];
        this.querySelectorAll(`.ng-container-body tbody.body tr`).forEach(($tr) => {
            this.#template.height += Math.max($tr.offsetHeight || 0, 28);
            this.#template.heights.push($tr.offsetHeight || 0);
            //if (['NINE-TABLE-SIMPLE'].includes(this.#host.tagName)) {
            //    trace.log(this.#host, $tr.offsetHeight, $tr.clientHeight);
            //}
        });
        this.#template.length = this.#template.heights.length;

        if (this.#index === 0) {
            const minRows = parseInt(this.#host.getAttribute('display-min-rows'), 10);
            const maxRows = parseInt(this.#host.getAttribute('display-max-rows'), 10);

            const h = (this.querySelector("nine-table-toolbar")?.offsetHeight || 0) +
                (this.querySelector("nine-table-footer")?.offsetHeight || 0) +
                (this.querySelector("thead")?.offsetHeight || 0) +
                (this.querySelector("tfoot")?.offsetHeight || 0) +
                (this.querySelector("tbody.head")?.offsetHeight || 0);

            if (this.#host.getAttribute('auto-height') === "true" || !isNaN(minRows) || !isNaN(maxRows)) {
                this.#host.setAttribute('scroll-bar', "none");
            }

            if (!isNaN(minRows)) {
                this.#host.style.minHeight = h + (this.#template.height * minRows) + "px";
            }

            if (!isNaN(maxRows)) {
                this.#host.style.maxHeight = h + (this.#template.height * maxRows) + "px";
            }
        }

        this.querySelectorAll(("tbody.body tr")).forEach(($tr) => {
            $tr.style.display = "none";
        });

        this.querySelector(`.ng-container-body table`).remove();

        activeParent(false);
    };

    generate = () => {

        this.#renderSplitContainers();

        this.#updateContainerWidths();

        this.#syncHeaderAndFooterHeights();

        this.#initRowHoverEvent();

        ['left', 'body', 'right'].forEach(type => {
            const prefix = `.ng-container-${type}`;
            this.#elements[type] = {
                thead: this.querySelector(`${prefix} thead`),
                tbody: {
                    head: this.querySelector(`${prefix} tbody.head`),
                    body: this.querySelector(`${prefix} tbody.body`),
                    foot: this.querySelector(`${prefix} tbody.foot`),
                },
                tfoot: this.querySelector(`${prefix} tfoot`),
            };
        });

        this.#rowManager.initialize();

        if (this.isAutoFitCol) {
            this.autoFit(true);
        } else {
            this.querySelector('nine-table-hscrollbar').refresh();
        }

        this.#grouping.initialize();

        this.loaded = true;
    };


    #updateContainerWidths = () => {

        if (this.#host.classList.contains("combo-list")) return;

        ['left', 'right', 'body'].forEach(type => {
            const containers = this.querySelectorAll(`.ng-container-${type}`);
            if (containers.length === 0) return;

            const firstTable = containers[0].querySelector('table');
            if (!firstTable) return;

            let width = 0;
            firstTable.querySelectorAll('col').forEach(col => {
                const w = parseInt(col.getAttribute('width'), 10);
                if (!isNaN(w)) width += w;
            });

            containers.forEach(container => {
                const tables = container.querySelectorAll('table');
                if (type === 'body') {
                    container.style.flex = `1`;
                } else {
                    container.style.flex = `0 0 ${width}px`;
                    container.style.width = `${width}px`;
                    container.style.minWidth = `${width}px`;
                    container.style.maxWidth = `${width}px`;
                }
            });
        });
    };

    #renderSplitContainers = () => {
        const colTypes = [
            { selector: '.ng-container-left', type: 'left' },
            { selector: '.ng-container-body', type: null },
            { selector: '.ng-container-right', type: 'right' }
        ];

        colTypes.forEach(({ selector, type }) => {
            this.querySelector(`.ng-sheet-body ${selector}`).appendChild(this.#createSplitTable(type));
        });
    };

    #createSplitTable = (targetFixedType) => {

        const $tbl = this.#source.table.cloneNode(true);

        if (targetFixedType === 'left') {
            $tbl.querySelectorAll("col, th, td").forEach($el => {
                if ($el.getAttribute("fixed") !== "left") $el.remove();
            });
        } else if (targetFixedType === 'right') {
            $tbl.querySelectorAll("col, th, td").forEach($el => {
                if ($el.getAttribute("fixed") !== "right") $el.remove();
            });
        } else {
            $tbl.querySelectorAll("[fixed=left], [fixed=right]").forEach($el => {
                $el.remove();
            });
        }

        return $tbl;
    };

    getRowHeight = () => {

        return this.#rowManager.getRowHeight();
    };

    getViewHeight = () => {

        const viewHeight = this.#elements.content.offsetHeight || 0;

        const fixedHeight = (this.#elements.body.thead?.offsetHeight || 0) +
            (this.#elements.body.tfoot?.offsetHeight || 0) +
            (this.#elements.body.tbody.head.offsetHeight || 0);

        return viewHeight - fixedHeight;
    };

    isLastRow = () => {

        const sheet = this.querySelector('.ng-sheet-body');
        const tbody = this.querySelector(".ng-container-body tbody.body");

        const offsetHeight = (this.#elements.body.tfoot?.offsetHeight || 0);

        const sheetBottom = sheet.getBoundingClientRect().bottom;
        const tbodyBottom = tbody.getBoundingClientRect().bottom;

        return (sheetBottom - offsetHeight) >= tbodyBottom;
    };

    scrollToX = (scrollLeft) => {
        const bodyContainer = this.querySelector('.ng-sheet-body .ng-container-body');
        if (bodyContainer) bodyContainer.scrollLeft = scrollLeft;
    };

    scrollToY = (scrollTop) => {
        const bodyViewport = this.querySelector('.ng-sheet-body');
        if (bodyViewport) bodyViewport.scrollTop = scrollTop;
    };

    #init = () => {

        this.#render();

        this.#cellSelection = new CellSelection(this);
        this.#cellNavigation = new CellNavigation(this);
        this.#colResizer = new ColResizer(this);
        this.#colMover = new ColMover(this);
        this.#colFix = new ColFixManager(this);

        this.#view = new SheetView(this);
        this.#filtering = new Filtering(this);
        this.#grouping = new GroupingManager(this);

        if (!this.#isSimple) {
            this.#sorting = new Sorting(this);
        }

        this.#elements.mainBody.addEventListener('scroll', (e) => {
            this.querySelectorAll("nine-table-filter-panel,cell-combo-panel").forEach($el => {
               $el.classList.remove('active');
            });
            this.querySelector("nine-table-hscrollbar").refresh();
        });
    };



    #render = () => {

        this.setAttribute("tabindex", "0");

        this.innerHTML = `
            <div class="ng-sheet-body">
                <div class="ng-sheet-body-content">
                    <div class="ng-container-left"></div>
                    <div class="ng-container-body">
                    
                    </div>
                    <div class="ng-container-right"></div>
                </div>
                <div class="ng-virtual-height-holder"></div>
            </div>

            <div class="nodata-overlay">Data Not Found</div>

            <nine-table-vscrollbar></nine-table-vscrollbar>
            <nine-table-hscrollbar></nine-table-hscrollbar>
            <div class="scroll-edge"></div>
            
            <nine-table-col-resizer-panel></nine-table-col-resizer-panel>
            
            
            <div class="ng-col-mover-grip"></div>
            <div class="ng-col-mover-indi"></div>
        `;

        this.#elements = {
            mainBody: this.querySelector('.ng-sheet-body .ng-container-body'),
            hscrollbar: this.querySelector('nine-table-hscrollbar'),
            vscrollbar: this.querySelector('nine-table-vscrollbar'),
            content: this.querySelector('.ng-sheet-body .ng-sheet-body-content'),
            scrollHolder: this.querySelector('.ng-sheet-body .ng-virtual-height-holder'),
        }
    };

    #syncHeaderAndFooterHeights = () => {

        const leftTable = this.querySelector('.ng-container-left table');
        const bodyTable = this.querySelector('.ng-container-body table');
        const rightTable = this.querySelector('.ng-container-right table');

        const leftHeaderRows = Array.from(leftTable.querySelectorAll('thead tr:not(.col-indicator-rowgroup)'));
        const bodyHeaderRows = Array.from(bodyTable.querySelectorAll('thead tr:not(.col-indicator-rowgroup)'));
        const rightHeaderRows = Array.from(rightTable.querySelectorAll('thead tr:not(.col-indicator-rowgroup)'));

        this.#applyMaxHeights(leftHeaderRows, bodyHeaderRows, rightHeaderRows);

        const leftFooterRows = Array.from(leftTable.querySelectorAll('tfoot tr'));
        const bodyFooterRows = Array.from(bodyTable.querySelectorAll('tfoot tr'));
        const rightFooterRows = Array.from(rightTable.querySelectorAll('tfoot tr'));

        this.#applyMaxHeights(leftFooterRows, bodyFooterRows, rightFooterRows);
    };

    #applyMaxHeights = (leftRows, bodyRows, rightRows) => {

        setTimeout(() => {
            const maxRows = Math.max(leftRows.length, bodyRows.length, rightRows.length);

            for (let i = 0; i < maxRows; i++) {

                const heights = [
                    leftRows[i]?.getBoundingClientRect().height || 0,
                    bodyRows[i]?.getBoundingClientRect().height || 0,
                    rightRows[i]?.getBoundingClientRect().height || 0
                ];
                const maxHeight = Math.max(...heights);

                if (maxHeight > 0) {
                    if (leftRows[i]) leftRows[i].style.height = `${maxHeight}px`;
                    if (bodyRows[i]) bodyRows[i].style.height = `${maxHeight}px`;
                    if (rightRows[i]) rightRows[i].style.height = `${maxHeight}px`;
                }
            }
        });
    };

    #initRowHoverEvent = () => {
        const bodyViewport = this.querySelector('.ng-sheet-body');
        if (!bodyViewport) return;

        let activeRowIndex = null;

        bodyViewport.addEventListener('mouseover', (e) => {
            const tr = e.target.closest('tr');
            if (!tr || !tr.dataset.row && tr.dataset.row !== '0') return;

            const rowIndex = tr.dataset.row;
            if (activeRowIndex === rowIndex) return;
            activeRowIndex = rowIndex;

            bodyViewport.querySelectorAll(`tr[data-row="${rowIndex}"]`).forEach($tr => {
                $tr.classList.add('hover');
            });
        });

        bodyViewport.addEventListener('mouseout', (e) => {
            const tr = e.target.closest('tr');
            if (!tr) return;

            const relatedTarget = e.relatedTarget;
            if (tr.contains(relatedTarget)) return;

            bodyViewport.querySelectorAll('tr.hover').forEach($tr => {
                $tr.classList.remove('hover');
            });
            activeRowIndex = null;
        });
    }

    #bindApiMethods = () => {
        //const apis = [this.#sheetAPI, this.#dataAPI];
        const apis = [this.#api];

        apis.forEach(api => {
            // api 인스턴스(this)에 직접 선언된 속성들과 프로토타입 속성을 모두 가져옴
            // Reflect.ownKeys를 사용하면 심볼이나 숨겨진 프로퍼티까지 안전하게 탐색 가능합니다.
            const keys = new Set([
                ...Reflect.ownKeys(api),
                ...Reflect.ownKeys(Object.getPrototypeOf(api))
            ]);

            keys.forEach(key => {
                // constructor나 내부 프라이빗 멤버(#)는 제외
                if (key === 'constructor' || String(key).startsWith('#')) return;

                const target = api[key];

                if (typeof target === 'function') {
                    if (!this[key]) {
                        //trace.log(`[Binding Function] ${key}`);
                        this[key] = (...args) => target.apply(api, args);
                    }
                } else if (target !== null && typeof target === 'object') {

                    if (!this[key]) {
                        //trace.log(`[Binding Object Namespace] ${key}`);
                        this[key] = target; // 객체 네임스페이스(예: row) 통째로 연결
                    }
                }
            });
        });
    }

    disconnectedCallback() {
        this.#colResizer?.destroy();
        this.#colMover?.destroy();
        this.innerHTML = '';
    }
}

if (!customElements.get('nine-table-sheet')) {
    customElements.define('nine-table-sheet', NineTableSheet);
}