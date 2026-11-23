import { trace } from "@nopeer";
import { ExportExcel } from "./ExportExcel.js";
import { ExportPdf } from "./ExportPdf.js";
import { ExportCsv } from "./ExportCsv.js";
import { extractSheetModel } from "./TableExportExtractor.js";

const DEFAULT_EXPORT_OPTIONS = {
    format: "excel",        // 'excel' | 'csv' | 'pdf'
    excelMode: "expr",      // 'expr' | 'data'
    sheetTarget: "all",     // 'all' | 'current'
    applyHeader: true,
    includeFooter: true,
};

export class NineTableExportPopup extends HTMLElement {
    #host = null;
    #dialog = null;
    #resolver = null;

    constructor() {
        super();
    }

    connectedCallback() {
        this.#host = this.getRootNode().host;
        this.#ensureRendered();
    }

    #ensureRendered() {
        if (!this.querySelector('input[name="opt-sheet-target"]') || !this.querySelector("nine-dialog")) {
            this.#render();
        }
        this.#dialog = this.querySelector("nine-dialog");
    }

    #getSheetContext() {
        const host = this.#host || this.getRootNode().host;
        const sheets = Array.from(host?.shadowRoot?.querySelectorAll("nine-table-sheet") || []);
        const activeSheet = sheets.find((s) => s.classList.contains("active")) || sheets[0];
        const currentSheetName = activeSheet.source.table.getAttribute("caption") || "Sheet1";

        return {
            sheetCount: sheets.length,
            currentSheetName,
        };
    }

    #render() {
        this.innerHTML = `
            <nine-dialog subject="Export">
                <div class="export-popup-body">
                    <div class="field-row">
                        <span class="title">Format</span>
                        <div class="segmented">
                            <label><input type="radio" name="opt-format" value="excel" /> Excel <span class="ext">.xlsx</span></label>
                            <label><input type="radio" name="opt-format" value="csv" /> CSV <span class="ext">.csv</span></label>
                            <label><input type="radio" name="opt-format" value="pdf" /> PDF <span class="ext">.pdf</span></label>
                        </div>
                    </div>

                    <div class="field-row" id="row-excel-mode">
                        <span class="title">Output Mode</span>
                        <div class="mode-cards">
                            <label class="mode-card" id="lbl-excel-expr">
                                <input type="radio" name="opt-excel-mode" value="expr" />
                                <span class="mode-title">Formatted / Renderer</span>
                                <span class="mode-desc">Displayed values on screen</span>
                            </label>
                            <label class="mode-card" id="lbl-excel-data">
                                <input type="radio" name="opt-excel-mode" value="data" />
                                <span class="mode-title">Raw Data</span>
                                <span class="mode-desc">Unprocessed source values</span>
                            </label>
                        </div>
                    </div>

                    <div class="field-row" id="row-sheet-target">
                        <span class="title">Sheets</span>
                        <div class="segmented">
                            <label id="lbl-sheet-all"><input type="radio" name="opt-sheet-target" value="all" /> All Sheets</label>
                            <label id="lbl-sheet-current"><input type="radio" name="opt-sheet-target" value="current" /> <span id="lbl-sheet-current-text">Current Sheet</span></label>
                        </div>
                    </div>

                    <div class="field-row">
                        <span class="title">Style & Options</span>
                        <div class="check-box-panel">
                            <label><span>Apply Header Style</span><input type="checkbox" id="opt-apply-header" /></label>
                            <label><span>Include Footer</span><input type="checkbox" id="opt-include-footer" /></label>
                        </div>
                    </div>
                </div>

                <div class="footer">
                    <button type="button" class="btn btn-cancel">Cancel</button>
                    <button type="button" class="btn btn-confirm">Export</button>
                </div>
            </nine-dialog>
        `;

        this.#dialog = this.querySelector("nine-dialog");

        const formatRadios = this.querySelectorAll('input[name="opt-format"]');
        formatRadios.forEach((radio) => {
            radio.addEventListener("change", () => this.#syncFormatUi());
        });

        this.querySelector(".btn-confirm").onclick = () => this.#handleConfirm();
        this.querySelector(".btn-cancel").onclick = () => this.#handleCancel();

        this.#dialog.addEventListener("close", () => {
            if (this.#resolver) {
                const resolve = this.#resolver;
                this.#resolver = null;
                resolve(null);
            }
        });
    }

    #syncFormatUi() {
        const selectedFormat = this.#getRadioValue("opt-format");
        const { sheetCount, currentSheetName } = this.#getSheetContext();

        const isCsv = selectedFormat === "csv";
        const isSingleSheetFormat = isCsv || selectedFormat === "pdf";
        const lockToCurrent = sheetCount <= 1 || isSingleSheetFormat;

        const $sheetAllRadio = this.querySelector('input[name="opt-sheet-target"][value="all"]');
        const $sheetCurrentRadio = this.querySelector('input[name="opt-sheet-target"][value="current"]');
        const $sheetAllLabel = this.querySelector("#lbl-sheet-all");
        const $sheetCurrentText = this.querySelector("#lbl-sheet-current-text");

        if ($sheetAllRadio && $sheetAllLabel) {
            $sheetAllRadio.disabled = lockToCurrent;
            $sheetAllLabel.classList.toggle("disabled", lockToCurrent);
        }

        if (lockToCurrent && $sheetCurrentRadio) {
            $sheetCurrentRadio.checked = true;
        }

        if ($sheetCurrentText) {
            $sheetCurrentText.textContent = isSingleSheetFormat
                ? `Current Sheet (${currentSheetName})`
                : "Current Sheet";
        }

        const csvDisabledCheckboxes = this.querySelectorAll(
            "#opt-apply-header, #opt-include-footer"
        );
        csvDisabledCheckboxes.forEach((cb) => {
            cb.disabled = isCsv;
            cb.closest("label")?.classList.toggle("disabled", isCsv);
        });
    }

    #getRadioValue(name) {
        return this.querySelector(`input[name="${name}"]:checked`)?.value || "";
    }

    #setRadioValue(name, value) {
        const target = this.querySelector(`input[name="${name}"][value="${value}"]`);
        if (target) target.checked = true;
    }

    #syncValues(opts) {
        this.#ensureRendered();
        const merged = { ...DEFAULT_EXPORT_OPTIONS, ...(opts || {}) };

        this.#setRadioValue("opt-format", merged.format);
        this.#setRadioValue("opt-excel-mode", merged.excelMode);
        this.#setRadioValue("opt-sheet-target", merged.sheetTarget);

        const $applyHeader = this.querySelector("#opt-apply-header");
        const $includeFooter = this.querySelector("#opt-include-footer");

        if ($applyHeader) $applyHeader.checked = Boolean(merged.applyHeader);
        if ($includeFooter) $includeFooter.checked = Boolean(merged.includeFooter);

        this.#syncFormatUi();
    }

    open(defaultOptions = null) {
        if (this.#resolver) {
            this.#resolver(null);
            this.#resolver = null;
        }

        this.#syncValues(defaultOptions);

        return new Promise((resolve) => {
            this.#resolver = resolve;
            this.#dialog.showModal();
        });
    }

    #handleConfirm() {
        const format = this.#getRadioValue("opt-format") || DEFAULT_EXPORT_OPTIONS.format;
        const { sheetCount } = this.#getSheetContext();

        const sheetTarget =
            format === "csv" || format === "pdf" || sheetCount <= 1
                ? "current"
                : this.#getRadioValue("opt-sheet-target") || DEFAULT_EXPORT_OPTIONS.sheetTarget;

        const selected = {
            format,
            excelMode: this.#getRadioValue("opt-excel-mode") || DEFAULT_EXPORT_OPTIONS.excelMode,
            sheetTarget,
            applyHeader: Boolean(this.querySelector("#opt-apply-header")?.checked),
            includeFooter: Boolean(this.querySelector("#opt-include-footer")?.checked),
        };

        const resolve = this.#resolver;
        this.#resolver = null;
        this.#dialog.close();
        if (resolve) resolve(selected);
    }

    #handleCancel() {
        const resolve = this.#resolver;
        this.#resolver = null;
        this.#dialog.close();
        if (resolve) resolve(null);
    }
}

export class ExportProgress extends HTMLElement {
    #host;
    #excel;
    #pdf;
    #csv;
    #popup;
    #progressDialog;
    #messageBox;
    #progressBar;
    #sheetStepsBox;
    #isProgressOpen = false;

    constructor() {
        super();
    }

    connectedCallback() {
        this.#host = this.getRootNode().host;
        this.#excel = new ExportExcel(this.#host);
        this.#pdf = new ExportPdf(this.#host);
        this.#csv = new ExportCsv(this.#host);
        this.#popup = this.#ensurePopup();
        this.#ensureRendered();
    }

    #ensureRendered() {
        if (!this.querySelector("nine-dialog")) {
            this.innerHTML = `
                <nine-dialog subject="Exporting">
                    <div class="export-progress-body">
                        <div class="export-progress-header">
                            <span class="export-message">Preparing...</span>
                            <div class="export-sheet-steps" hidden></div>
                        </div>
                        <progress class="export-progress-bar" value="0" max="100"></progress>
                    </div>
                </nine-dialog>
            `;
        }
        this.#progressDialog = this.querySelector("nine-dialog");
        this.#messageBox = this.querySelector(".export-message");
        this.#progressBar = this.querySelector(".export-progress-bar");
        this.#sheetStepsBox = this.querySelector(".export-sheet-steps");
    }

    #ensurePopup() {
        let popup = this.#host?.shadowRoot?.querySelector("nine-table-export-popup");
        if (!popup && this.#host?.shadowRoot) {
            popup = document.createElement("nine-table-export-popup");
            this.#host.shadowRoot.appendChild(popup);
        }
        return popup;
    }

    #renderSheetSteps(sheetCount) {
        if (!this.#sheetStepsBox) return;

        if (sheetCount <= 1) {
            this.#sheetStepsBox.hidden = true;
            this.#sheetStepsBox.innerHTML = "";
            return;
        }

        // 이미 동일한 시트 개수로 렌더링되어 있다면 단계 상태(done/active) 유지
        if (this.#sheetStepsBox.children.length === sheetCount && !this.#sheetStepsBox.hidden) {
            return;
        }

        this.#sheetStepsBox.hidden = false;
        this.#sheetStepsBox.innerHTML = Array.from({ length: sheetCount }, (_, idx) => {
            const stepNum = idx + 1;
            const activeClass = stepNum === 1 ? " active" : "";
            return `<span class="sheet-step${activeClass}" data-step="${stepNum}">${stepNum}</span>`;
        }).join("");
    }

    #updateSheetSteps(currentSheetIndex) {
        if (!this.#sheetStepsBox || this.#sheetStepsBox.hidden || !currentSheetIndex) return;

        this.#sheetStepsBox.querySelectorAll(".sheet-step").forEach((el) => {
            const step = Number(el.dataset.step);
            el.classList.toggle("done", step < currentSheetIndex);
            el.classList.toggle("active", step === currentSheetIndex);
        });
    }

    showProgress(total = 1, message = "Preparing...", sheetIndex = 1) {
        this.#ensureRendered();
        this.#messageBox.textContent = message;
        this.#progressBar.max = total > 0 ? total : 1;
        this.#progressBar.value = 0;
        this.#updateSheetSteps(sheetIndex);

        if (!this.#isProgressOpen) {
            this.#isProgressOpen = true;
            this.#progressDialog.showModal();
        }
    }

    updateProgress(current, total, message) {
        if (!this.#progressDialog) return;
        if (total > 0) this.#progressBar.max = total;
        this.#progressBar.value = current;
        if (message) this.#messageBox.textContent = message;
    }

    hideProgress() {
        if (this.#progressDialog && this.#isProgressOpen) {
            this.#isProgressOpen = false;
            this.#progressDialog.close();
        }
        if (this.#sheetStepsBox) {
            this.#sheetStepsBox.innerHTML = "";
        }
    }

    exportData = async (options = null) => {
        const popup = this.#popup || this.#ensurePopup();

        let targetOptions = options;
        if (!targetOptions || targetOptions.showDialog) {
            if (!popup) return;
            targetOptions = await popup.open(targetOptions);
            if (!targetOptions) return;
        }

        const merged = { ...DEFAULT_EXPORT_OPTIONS, ...targetOptions };
        if (merged.format === "csv" || merged.format === "pdf") {
            merged.sheetTarget = "current";
        }

        const totalSheets = this.#host?.shadowRoot?.querySelectorAll("nine-table-sheet").length || 1;
        const targetSheetCount = merged.sheetTarget === "current" ? 1 : totalSheets;

        this.#ensureRendered();
        this.#renderSheetSteps(targetSheetCount);

        const progress = {
            show: (total, msg, sheetIndex = 1) => this.showProgress(total, msg, sheetIndex),
            update: (cur, total, msg) => this.updateProgress(cur, total, msg),
            hide: () => this.hideProgress(),
        };

        try {
            switch (merged.format) {
                case "excel":
                    await this.#excel.export(merged, progress);
                    return;
                case "pdf":
                    await this.#pdf.export(merged, extractSheetModel, progress);
                    return;
                case "csv":
                    await this.#csv.export(merged, progress);
                    return;
                default:
                    await nine.alert(`${String(merged.format).toUpperCase()} export is not supported yet.`);
            }
        } finally {
            this.hideProgress();
        }
    };

    exportExcel = (options = null) => {
        return this.exportData({ showDialog: false, ...(options || {}), format: "excel" });
    };
    exportCsv = (options = null) => {
        return this.exportData({ showDialog: false, ...(options || {}), format: "csv" });
    };
    exportPdf = (options = null) => {
        return this.exportData({ showDialog: false, ...(options || {}), format: "pdf" });
    };
}


if (!customElements.get("nine-table-export-popup")) {
    customElements.define("nine-table-export-popup", NineTableExportPopup);
}

if (!customElements.get("nine-table-export-progress")) {
    customElements.define("nine-table-export-progress", ExportProgress);
}