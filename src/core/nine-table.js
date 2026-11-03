import { trace } from "@nopeer";
import { ngDataManager } from '@/data/ngDataManager.js';
import { fields } from "@/data/Fields.js";
import { LayoutManager } from '@/layout/core/LayoutManager.js';
import { ExprEngine } from "@/core/ExprEngine.js";
import { NINE_TABLE } from "@/core/constants.js";

export default class NineTable extends HTMLElement {
    #shadowRoot;
    #dataManager;
    #layoutManager;
    #templateCnt = 0;
    #customStyle = '';

    constructor() {
        super();

        if (["NINE-TABLE"].includes(this.tagName)) {
            trace.log("Welcome nine-table", __APP_VERSION__);
        }

        this.#shadowRoot = this.attachShadow({ mode: 'open' });
        this.#dataManager = new ngDataManager(this);
    }

    connectedCallback() {
        setTimeout(() => {
            this.#templateCnt = this.querySelectorAll("table")?.length;

            this.fields = new fields(this);
            this.exprEngine = new ExprEngine(this);

            this.#bindDynamicSetters();

            this.#layoutManager = new LayoutManager(this);

            this.#dispatchLoad();
        });
    }

    disconnectedCallback() {
        //trace.log('NineTable disconnected.');
    }

    #dispatchLoad = () => {

        let checkCount = 0;
        const maxChecks = 50; // 최대 5초 대기 (100ms * 50)

        const checkTimer = setInterval(() => {
            checkCount++;

            const sheets = this.shadow.querySelectorAll('nine-table-sheet');

            if (checkCount >= maxChecks) {
                clearInterval(checkTimer);
            }

            if (sheets.length >= this.#templateCnt) {
                let loadSheetCnt = 0;
                sheets.forEach($sheet => {
                    if ($sheet.loaded) loadSheetCnt++;
                });

                if (loadSheetCnt >= this.#templateCnt) {
                    clearInterval(checkTimer);
                    this.loaded = true;
                    this.dispatchEvent(new CustomEvent(NINE_TABLE.EVENT.LOAD, { bubbles: true, detail: { target: this } }));
                }
            }
        }, 100);
    }

    // 🎯 공통 데이터 & API 접근자
    get shadow() { return this.#shadowRoot; }
    get dataManager() { return this.#dataManager; }
    get data() { return this.#dataManager.data; }
    get row() { return this.#dataManager.row; }
    get customStyle() {
        return this.#customStyle;
    }

    scrollTo = (dataRow, callback) => {
        this.#shadowRoot.querySelectorAll('nine-table-sheet.active').forEach($sheet => {
            $sheet.scrollTo(dataRow, callback);
        });
    }

    currentRow = () => {
        let rows = this.currentRows();
        return (rows.length === 0) ? -1 : rows[0];
    }
    currentRows = () => {

        let rows = [];
        this.#shadowRoot.querySelectorAll('nine-table-sheet.active').forEach($sheet => {

            const arr = $sheet.view.getArray($sheet.selection.minRow);
            const rowid = arr.m._[NINE_TABLE.META.INDEX.ROWID];

            //trace.log(this.data.getArray($sheet.selection.minRow));

            rows.push(rowid);
        });

        return rows;
    }

    addRow = (dataSource, updateState = true) => {
        return this.data.add(dataSource, updateState);
    }
    insertRow = (index, dataSource, updateState = true) => {

        const activeSheet = this.#shadowRoot.querySelector('nine-table-sheet.active');
        if (!activeSheet) return;

        const currentJson = activeSheet.view.get(index);
        const rowid = currentJson.m._[NINE_TABLE.META.INDEX.ROWID];

        const toRowid = this.data.insert(rowid, dataSource, updateState);
        const records = activeSheet.view.getArray();

        const targetIndex = records.findIndex(record => {
            if (!record || !record.m || !record.m._) return false;
            return record.m._[NINE_TABLE.META.INDEX.ROWID] === toRowid; // 타입 차이 방지를 위해 == 사용
        });

        return targetIndex;
    };
    removeRow = (index) => {

        const activeSheet = this.#shadowRoot.querySelector('nine-table-sheet.active');
        if (!activeSheet) return;

        const currentJson = activeSheet.view.get(index);
        const rowid = currentJson.m._[NINE_TABLE.META.INDEX.ROWID];

        this.data.remove(rowid);
    };

    currentIndex = () => {
        let rows = this.currentIndexs();
        return (rows.length === 0) ? -1 : rows[0];
    }
    currentIndexs = () => {

        let rows = [];
        this.#shadowRoot.querySelectorAll('nine-table-sheet.active').forEach($sheet => {
            rows.push($sheet.selection.minRow);
        });

        return rows;
    }

    addProvider(provider) {
        if (!provider || typeof provider !== 'object') return;

        const { style, ...methods } = provider;

        if (style && typeof style === 'string') {
            this.#customStyle = style;

            const styleEl = this.#shadowRoot.getElementById('nine-table-scoped-custom-style');
            if (styleEl) {
                styleEl.textContent = style;
            }
        }

        if (Object.keys(methods).length > 0) {
            setTimeout(() => {
                Object.entries(methods).forEach(([name, fn]) => {
                    if (typeof fn === 'function') {
                        this[name] = fn;
                    }
                });

                this.rerenderer();
            });
        }
    }

    setData(records) {
        this.#dataManager.data.set(records);
        this.refresh();
    }

    refresh() {
        this.activeSheet?.invalidate();
    }


    set loading(val) {
        if (this.#layoutManager) this.#layoutManager.loading = val;
    }

    rerenderer() {

        this.activeSheet?.querySelectorAll("tbody.body th,tbody.body td").forEach(($cell) => {
            const customComp = Array.from($cell.children).find($el => {
                return $el.tagName.toLowerCase().startsWith('cell-') && typeof $el.rerenderer === 'function'
            });

            customComp?.rerenderer();
        })
    }

    sheet = (idOrIndex) => {
        if (idOrIndex === null || idOrIndex < 0) return this.activeSheet;
        const sheets = Array.from(this.shadow.querySelectorAll('nine-table-sheet'));

        if (typeof idOrIndex === 'number') return sheets[idOrIndex] || null;
        if (typeof idOrIndex === 'string') {
            return this.shadow.querySelector(`nine-table-sheet#${idOrIndex}, nine-table-sheet[data-sheet-id="${idOrIndex}"]`) || null;
        }
        return sheets[0] || null;
    }

    get sheets() {
        return Array.from(this.shadow.querySelectorAll('nine-table-sheet'));
    }

    get activeSheet() {
        return this.shadow.querySelector('nine-table-sheet.active') || null;
    }

    #bindDynamicSetters() {
        const extractedMethodNames = new Set();

        this.querySelectorAll('[data-source]').forEach(el => {
            const dataSource = el.getAttribute('data-source');
            if (!dataSource) return;

            const matches = dataSource.matchAll(/(?:host\.)?([a-zA-Z0-9_$]+)\s*\(/g);
            for (const match of matches) {
                const name = match[1];
                if (name && name !== 'host') {
                    extractedMethodNames.add(name);
                }
            }
        });

        extractedMethodNames.forEach(methodName => {
            let internalValue = null;

            Object.defineProperty(this, methodName, {
                set: (newValue) => {
                    internalValue = newValue;

                    this.rerenderer();
                },
                get: () => internalValue,
                configurable: true,
                enumerable: true
            });
        });
    }

    execute = (fn) => {
        setTimeout(() => {
            this.loading = true;
            setTimeout(() => {
                try {
                    fn.call(this);
                } finally {
                    this.loading = false;
                }
            });
        });
    }
}

if (!customElements.get('nine-table')) {
    customElements.define('nine-table', NineTable);
}

if (!customElements.get('nine-table-simple')) {
    customElements.define('nine-table-simple', class extends NineTable {
        connectedCallback() {
            this.setAttribute('theme', 'simple');

            super.connectedCallback();
        }
    });
}