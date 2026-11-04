import { trace } from "@nopeer";
import { ngDataManager } from '@/data/ngDataManager.js';
import { fields } from "@/data/Fields.js";
import { LayoutManager } from '@/layout/core/LayoutManager.js';
import { ExprEngine } from "@/core/ExprEngine.js";
import { NINE_TABLE } from "@/core/constants.js";
import { DataAPI } from '../api/DataAPI.js';
import { NineTableAPI } from '../api/NineTableAPI.js';

export default class NineTable extends HTMLElement {
    #shadowRoot;
    #dataManager;
    #layoutManager;
    #dataApi;
    #sheetApi;
    #templateCnt = 0;
    #customStyle = '';

    constructor() {
        super();

        if (["NINE-TABLE"].includes(this.tagName)) {
            trace.log("Welcome nine-table", __APP_VERSION__);
        }

        this.#shadowRoot = this.attachShadow({ mode: 'open' });
        this.#dataManager = new ngDataManager(this);

        this.#dataApi = new DataAPI(this);
        this.#sheetApi = new NineTableAPI(this);

        this.#bindApiMethods();
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
    //get row() { return this.#dataManager.row; }
    get customStyle() {
        return this.#customStyle;
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

    #bindApiMethods() {
        //const apis = [this.#sheetAPI, this.#dataApi];
        const apis = [this.#sheetApi];

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
                        //trace.log(`[Binding Object Namespace] ${key}`, target);
                        this[key] = target; // 객체 네임스페이스(예: row) 통째로 연결
                    }
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