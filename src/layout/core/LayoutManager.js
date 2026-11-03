import { trace } from "@nopeer";
import '@/layout/nine-table-sheets.js';
import '@/layout/nine-table-sheets-footer.js';
import '@/layout/nine-table-toolbar.js';
import { NineTableSheet } from "@/layout/nine-table-sheet.js";

export class LayoutManager {
    #host;

    constructor(owner) {
        this.#host = owner;
        this.#init();
    }

    #init = () => {
        this.#render();

        new ResizeObserver((entries) => {
            for (let entry of entries) {
                const isAutoHeight = this.#host.getAttribute('auto-height') === 'true';
                if (isAutoHeight) {
                    this.#applyAutoHeight();
                }
            }
        }).observe(this.#host);
    }

    set loading(val) {
        if (!!val) {
            this.#host.classList.add("loading");
        } else {
            this.#host.classList.remove("loading");
        }
    }

    #applyAutoHeight = () => {
        const activeSheets = Array.from(this.#host.shadowRoot.querySelectorAll('nine-table-sheet.active'));
        if (activeSheets.length === 0) return;

        const maxDisplayRows = parseInt(this.#host.getAttribute('max-display-row'), 10) || 10;
        const maxRowHeight = Math.max(...activeSheets.map(sheet => sheet.getRowHeight()));

        const toolbarEl = this.#host.shadowRoot.querySelector('nine-table-toolbar');
        const footerEl = this.#host.shadowRoot.querySelector('nine-table-sheets-footer');

        const toolbarHeight = toolbarEl ? toolbarEl.getBoundingClientRect().height : 0;
        const footerHeight = footerEl ? footerEl.getBoundingClientRect().height : 0;
        const extraPadding = NineTableSheet.SCROLLBAR_SIZE;

        const calculatedHeight = (maxDisplayRows * maxRowHeight) + toolbarHeight + footerHeight + extraPadding;

        this.#host.style.height = `${calculatedHeight}px`;
    };

    #render = () => {

        const rawElements = Array.from(this.#host.children);
        const rawTables = rawElements.filter(el => (el.tagName.toUpperCase() === 'TABLE') );
        const isAutoHeight = this.#host.getAttribute('auto-height') === 'true';
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
                ${this.#host.customStyle}
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

        this.#host.shadowRoot.querySelectorAll('nine-table-sheet').forEach(($el, idx) => {

            if (rawTables[idx]) {
                setTimeout(() => {
                    $el.generate(rawTables[idx], idx);
                    if (isAutoHeight) {
                        this.#applyAutoHeight();
                    }
                });
            }
        });
    };
}