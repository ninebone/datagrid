import { EditableCellElement } from "./core/CellElement.js";
import {trace} from "@nopeer";

class CellCheckbox extends EditableCellElement {
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

    get dataSource() {
        return [
            { value: this.trueValue, text: this.#trueText },
            { value: this.falseValue, text: this.#falseText }
        ];
    }

    #initEvent = () => {
        if (this.closest("thead")) {
            this.#target.addEventListener("change", (e) => {
                super.sheet.querySelector(`tbody.body [data-col="${super.cell.dataset.col}"] cell-checkbox`)?.selectAll(e.target.checked);
            });
        }

        this.#target.addEventListener("change", (event) => {
            if (!this.closest("tbody")) return;

            if (this.#isRadio) {
                this.selectAll(false);
                this.value = this.trueValue;
            }
            else {
                this.value = event.target.checked ? this.trueValue : this.falseValue;
            }

            this.sheet.rowManager.refresh(true);
        });

        this.cell.addEventListener("keydown", e => {

            if (this.cell.hasAttribute("readonly") || this.cell.classList.contains("readonly")) return;
            if (this.cell.getAttribute("disabled") === "true") return;
            if (this.style.display === "none") return;

            if (e.code === "Space") {
                e.preventDefault();

                this.value = this.#target.checked ? this.falseValue : this.trueValue;

                this.sheet.rowManager.refresh(true);
            }
        });
    };

    #renderer = () => {

        const trueValue = this.trueValue;//this.cell.getAttribute("true-value") || false;
        //const selectedBorderColor = this.getAttribute("selected-border-color") || "dimgray";

        const originalContent = this.cell.getAttribute("content") || "";
        const childHtml = this.#isRadio ? `<input type="radio" value="${trueValue}" />` : `<label><input type="checkbox" /><span>${originalContent}</span></label>`;

        this.innerHTML = `
            ${childHtml}
        `;
    }

    refresh = () => {
        const val = super.refresh();

        this.#target.checked = (val === this.trueValue);

        if (this.isValid()) {
            this.#validate(val);
        }

        const displayText = (val === this.trueValue) ? this.#trueText : ((val === this.falseValue) ? this.#falseText : val);

        if (this.#label) {
            this.#label.textContent = displayText;
        }
    };

    #validate = (val) => {

        this.cell.classList.remove("invalid");

        if (val !== "" && val !== null && val !== undefined) {
            if (val !== this.trueValue && val !== this.falseValue) {
                this.cell.classList.add("invalid");
            }
        }
    };

    selectAll = (v) => {
        if (this.closest("thead")) return; // 헤더 자신은 제외

        const data = this.host.data.getArray();
        const colIndex = this.host.fields.indexOf(this.cell.dataset.bind);

        if (colIndex < 0) return;

        for (let i = 0; i < data.length; i++) {
            if (this.#enable && super.getExprValue(this.#enable, data[i], i, this.cell) === false) continue;
            if (this.#readonly && super.getExprValue(this.#readonly, data[i], i, this.cell) === true) continue;
            if (this.#visible && super.getExprValue(this.#visible, data[i], i, this.cell) === false) continue;

            data[i].v[colIndex] = v ? this.trueValue : this.falseValue;
        }

        super.sheet.invalidate();
    };

    get trueValue() {
        return this.cell.getAttribute("true-value") || "Y";
    }
    get falseValue() {
        return this.cell.getAttribute("false-value")|| "N";
    }
    get #trueText() {
        return this.cell.getAttribute("true-text") || "";
    }
    get #falseText() {
        return this.cell.getAttribute("false-text") || "";
    }
    get #isRadio() {
        return this.cell.getAttribute("is-radio") || false;
    }
    get #enable() {
        return this.cell.getAttribute("enable") || false;
    }
    get #readonly() {
        return this.cell.getAttribute("readonly") || false;
    }
    get #visible() {
        return this.cell.getAttribute("visible") || false;
    }
}

if (!customElements.get('cell-checkbox')) {
    customElements.define("cell-checkbox", CellCheckbox);
}