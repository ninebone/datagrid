import { TheadCellElement } from "./core/CellElement.js";
import {trace} from "@nopeer";

class CellCheckboxThead extends TheadCellElement {
    #target;
    #label;

    constructor() {
        super();
    }

    connectedCallback() {
        super.connectedCallback();

        this.#renderer();

        this.#target = this.querySelector("input");
        this.#label = this.querySelector("span");

        this.#initEvent();
    }

    #initEvent = () => {
        this.#target.addEventListener("change", (e) => {
            super.sheet.querySelector(`tbody.body [data-col="${super.cell.dataset.col}"] cell-checkbox`)?.selectAll(e.target.checked);
            this.#updateState();
        });
    };

    #renderer = () => {
        const originalContent = this.cell.getAttribute("content") || "";

        this.innerHTML = `
            <label><input type="checkbox" /><span>${originalContent}</span></label>
        `;
    }

    #updateState = () => {
        const $sourceCell = this.sheet.source.table.querySelector(`tbody.body [data-col="${this.cell.dataset.col}"]`);
        const $bodyCell = this.sheet.querySelector(`tbody.body [data-col="${this.cell.dataset.col}"]`);
        if (!$sourceCell || !$bodyCell || !$bodyCell.dataset.bind) return;

        const $bodyCheckbox = $bodyCell.querySelector(`cell-checkbox`);
        if (!$bodyCheckbox) return;

        const data = this.sheet.view.getArray();
        if (!data || data.length === 0) return;

        const visibleExpr = $sourceCell.getAttribute("visible");
        const enableExpr = $sourceCell.getAttribute("enable");

        const fieldIdx = this.host.fields.get().indexOf($bodyCell.dataset.bind);

        let validItems = [];
        if (visibleExpr || enableExpr) {
            for (let i = 0; i < data.length; i++) {
                let isEnabled = true;
                let isVisible = true;

                if (enableExpr) {
                    isEnabled = this.host.exprEngine.evaluate(enableExpr, data[i], i);
                }
                if (visibleExpr) {
                    isVisible = this.host.exprEngine.evaluate(visibleExpr, data[i], i);
                }

                if (isEnabled && isVisible) {
                    validItems.push(data[i].v[fieldIdx]);
                }
            }
        }
        else {
            validItems = data.extract($bodyCell.dataset.bind);
        }

        if (validItems.length === 0) {
            this.#target.checked = false;
            this.#target.indeterminate = false;
            return;
        }

        const totalCount = validItems.length;
        const checkedCount = validItems.filter(item => item === $bodyCheckbox.trueValue).length;

        this.#target.checked = (checkedCount === totalCount) ? true : false;
        this.#target.indeterminate = (checkedCount === 0 || checkedCount === totalCount) ? false : true;
    }

    refresh = () => {
        this.#updateState();
    };
}

if (!customElements.get('cell-checkbox-thead')) {
    customElements.define("cell-checkbox-thead", CellCheckboxThead);
}