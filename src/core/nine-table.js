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
    #templateCnt = 0;      // 🎯 로딩 상태 플래그

    constructor() {
        super();

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
            //this.dispatchEvent(new CustomEvent('load', { bubbles: true, detail: { target: this } }));
        });
    }

    disconnectedCallback() {
        trace.log('NineTable disconnected.');
    }

    #dispatchLoad = () => {
        // 🎯 2. 변수명 오타 수정 (#sheetCnt -> #templateCnt)
        //trace.log("*********************** template count:", this.#templateCnt);

        let checkCount = 0;
        const maxChecks = 50; // 최대 5초 대기 (100ms * 50)

        const checkTimer = setInterval(() => {
            checkCount++;

            const sheets = this.shadow.querySelectorAll('nine-table-sheet');
            //trace.log("Current mounted sheets:", sheets.length);

            if (checkCount >= maxChecks) {
                clearInterval(checkTimer);
            }

            if (sheets.length >= this.#templateCnt) {
                let loadSheetCnt = 0;
                sheets.forEach($sheet => {
                    if ($sheet.loaded) loadSheetCnt++;
                });

                //trace.log('Checking sheet loaded status:', loadSheetCnt, '/', this.#templateCnt);

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

    setData(records) {
        this.#dataManager.data.set(records);
        this.refresh();
    }

    refresh() {
        this.activeSheet?.invalidate();
    }

    // 🎯 섀도우 돔 내부에서 로딩바 요소를 안전하게 캐싱


    set loading(val) {
        if (this.#layoutManager) this.#layoutManager.loading = val;
    }

    /**
     * 랜더링 이후에 생기는 data-source 처리기능
     */
    rerenderer() {

        this.activeSheet?.querySelectorAll("tbody.body th,tbody.body td").forEach(($cell) => {
            const customComp = Array.from($cell.children).find($el => {
                return $el.tagName.toLowerCase().startsWith('cell-') && typeof $el.rerenderer === 'function'
            });

            customComp?.rerenderer();
        })
    }

    // 시트 제어 API
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

            // 💡 [수정] 뒤에 여멀림 괄호 '('가 오는 형태만 매칭하여 'DEPART' 같은 파라미터는 배제!
            const matches = dataSource.matchAll(/(?:host\.)?([a-zA-Z0-9_$]+)\s*\(/g);
            for (const match of matches) {
                const name = match[1];
                if (name && name !== 'host') {
                    extractedMethodNames.add(name);
                }
            }
        });

        // 추출된 메서드 이름별로 NineTable 인스턴스에 동적 세터 생성
        extractedMethodNames.forEach(methodName => {
            let internalValue = null;

            Object.defineProperty(this, methodName, {
                set: (newValue) => {
                    internalValue = newValue;

                    // 값이 대입되는 순간 그리드 자동 갱신
                    //this.refresh();
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
            // simple 태그로 생성되면 자동으로 mode="simple" 속성 부여
            this.setAttribute('theme', 'simple');

            super.connectedCallback();
        }
    });
}