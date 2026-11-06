import { trace } from "@nopeer";
import '@/layout/nine-table-sheets.js';
import '@/layout/nine-table-sheets-footer.js';
import '@/layout/nine-table-toolbar.js';
import { NineTableSheet } from "@/layout/nine-table-sheet.js";
import {PreCompiler} from "@/layout/core/PreCompiler.js";
import {NINE_TABLE} from "@";

export class LayoutManager {
    #host;

    constructor(owner) {
        this.#host = owner;
        this.#init();
    }

    #init = () => {
        this.#render();
        this.#initEvent();
    }

    set loading(val) {
        if (!!val) {
            this.#host.classList.add("loading");
        } else {
            this.#host.classList.remove("loading");
        }
    }



    #render = () => {

        const rawElements = Array.from(this.#host.children);
        const rawTables = rawElements.filter(el => (el.tagName.toUpperCase() === 'TABLE') );
        const sheetCount = rawTables.length;

        const sheetsHtml = rawTables.map((tbl, idx) => {
            const className = idx === 0 ? 'active' : '';
            const sheetId = tbl.id || `sheet${idx + 1}`;

            const sheetTag = `<nine-table-sheet class="${className}" data-index="${idx}" data-sheet-id="${sheetId}" id="${sheetId}"></nine-table-sheet>`;
            const splitterTag = idx < sheetCount - 1 ? `<nine-splitter class="h" data-split-index="${idx}"></nine-splitter>` : '';
            return sheetTag + splitterTag;
        }).join('');

        const cssImports = [
            `@import "https://cdn.jsdelivr.net/npm/@ninebone/datagrid@${__APP_VERSION__}/dist/css/nine-table.css";`,
        ];

        if (nine["nine-table"] && nine["nine-table"].cssFile) {
            cssImports.push(`@import "${nine["nine-table"].cssFile}";`);
        }

        this.#host.shadowRoot.innerHTML = `
            <style>
                ${cssImports.join('\n')}
                ${this.#host.provider.style.value}
            </style>
            
            <nine-table-toolbar></nine-table-toolbar>

            <nine-table-body>
                <nine-table-summary></nine-table-summary>
                <div class="ng-loading-bar"></div>
                <nine-table-sheets>
                    <nine-table-sheets-body>
                        ${sheetsHtml}
                    </nine-table-sheets-body>
                    <nine-table-sheets-footer></nine-table-sheets-footer>
                </nine-table-sheets>
                <nine-table-analysis></nine-table-analysis>
            </nine-table-body>
            <nine-table-footer></nine-table-footer>
        `;

        rawTables.forEach($el => {
            PreCompiler.initializeTable(this.#host, $el);
        })

        this.#host.shadowRoot.querySelectorAll('nine-table-sheet').forEach(($sheet, idx) => {
            $sheet.classList.add('active');
            $sheet.generateTemplate(rawTables[idx], idx);
        });

        this.#host.shadowRoot.querySelectorAll('nine-table-sheet').forEach(($sheet) => {

            setTimeout(() => {
                $sheet.generate();
                if (this.#isAutoHeight) this.#applyAutoHeight();
            });
        });


        setTimeout(() => {
            this.#host.data.clear();
        });
    };

    #initEvent = () => {

        this.#host.addEventListener(NINE_TABLE.EVENT.ROW_ADDED, () => {
            if (this.#isAutoHeight) this.#applyAutoHeight();
        });

        this.#host.addEventListener(NINE_TABLE.EVENT.ROW_REMOVED, () => {
            if (this.#isAutoHeight) this.#applyAutoHeight();
        });

        let lastHeight = 0; // 직전 높이를 기억할 변수

        new ResizeObserver((entries) => {
            for (let entry of entries) {
                if (entry.target.tagName === "NINE-TABLE") {
                    const currentHeight = entry.contentRect.height;

                    if (currentHeight !== lastHeight) {
                        lastHeight = currentHeight;
                        if (this.#isAutoHeight) {
                            this.#applyAutoHeight();
                        }
                    }
                }
            }
        }).observe(this.#host);
    };

    #applyAutoHeight = () => {
        this.#host.shadowRoot.querySelectorAll('nine-table-sheet').forEach(($sheet) => {
            if ($sheet.index === 0) {
                const fixedHeight = ($sheet.querySelector("thead")?.offsetHeight || 0) +
                    ($sheet.querySelector("tfoot")?.offsetHeight || 0) +
                    ($sheet.querySelector("tbody.head")?.offsetHeight || 0);
                const basicHeight = this.#host.offsetHeight - $sheet.offsetHeight + fixedHeight;

                const h = Math.min($sheet.template.height * $sheet.view.count(), window.innerHeight * 0.8);

                this.#host.style.height = basicHeight + (h) + "px";
            }
        });
    };

    get #isAutoHeight() {
        return this.#host.getAttribute('auto-height') === 'true';
    }
}