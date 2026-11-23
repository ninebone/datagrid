import { trace } from "@nopeer";
import { ExprEngine } from "@/core/ExprEngine.js";
import { extractPlainText, extractRawCellValue, buildExportFileName } from "./TableExportExtractor.js";

export class ExportCsv {
    #host;
    #delimiter;
    #bom;

    constructor(host, { delimiter = ",", bom = true } = {}) {
        this.#host = host;
        this.#delimiter = delimiter;
        this.#bom = bom;
    }

    export = async (options = {}, progress = null) => {
        const sheets = Array.from(this.#host.shadowRoot?.querySelectorAll("nine-table-sheet") || []);
        const activeSheet = sheets.find((s) => s.classList.contains("active")) || sheets[0];

        if (!activeSheet) {
            await nine.alert("No sheets available to export.");
            return;
        }

        const sourceTable = activeSheet.source?.table;
        if (!sourceTable) {
            await nine.alert("No table data available to export.");
            return;
        }

        const bodyTrs = Array.from(sourceTable.querySelectorAll("tbody tr:not([group-by])"));
        if (bodyTrs.length === 0) {
            await nine.alert("No table definition available to export.");
            return;
        }

        const isGroupBy = Boolean(activeSheet.isGroupBy);
        const viewItems = activeSheet.view?.getArray?.() || [];
        const records = isGroupBy
            ? viewItems.filter((item) => item && item.type === "data").map((item) => item.record)
            : viewItems;
        const totalCount = records.length;

        const sheetHost = activeSheet.host || activeSheet.getRootNode()?.host || this.#host;
        const exprEngine = activeSheet.exprEngine || sheetHost?.exprEngine || new ExprEngine(sheetHost);
        const fields = activeSheet.fields?.get?.() || sheetHost?.fields?.get?.() || [];
        const mode = options.excelMode || "expr";
        const dataSourceCache = new Map();

        let exprSeq = 0;

        const flatCells = [];
        bodyTrs.forEach((tr) => {
            let colTracker = 1;
            tr.querySelectorAll("td, th").forEach((td) => {
                const colSpan = parseInt(td.getAttribute("colspan") || td.getAttribute("colSpan"), 10) || 1;
                const dataBind = td.getAttribute("data-bind")?.trim();
                const dataExpr = td.getAttribute("data-expr")?.trim();

                let headerKey = "";
                if (dataBind) {
                    headerKey = dataBind;
                } else if (dataExpr) {
                    exprSeq += 1;
                    // 표현식 내 data.필드명 패턴이 있으면 추출해 조합, 없으면 expr_N으로 대체
                    const boundFields = Array.from(dataExpr.matchAll(/\bdata\.([A-Za-z0-9_]+)\b/g)).map((m) => m[1]);
                    const uniqueFields = [...new Set(boundFields)];
                    headerKey = uniqueFields.length > 0 ? uniqueFields.join("_") : `expr_${exprSeq}`;
                } else {
                    headerKey = fields[colTracker - 1] || `col_${flatCells.length + 1}`;
                }

                flatCells.push({
                    td,
                    colTracker,
                    headerKey,
                });

                colTracker += colSpan;
            });
        });

        if (flatCells.length === 0) {
            await nine.alert("No columns available to export.");
            return;
        }

        const showProgress = totalCount > 500;
        if (showProgress) {
            progress?.show(totalCount, "generating CSV...");
        }

        const lines = [];

        // 1. 상단 1줄: data-bind / data-expr 헤더
        lines.push(this.#formatRow(flatCells.map((c) => c.headerKey)));

        // 2. 데이터 레코드 1건당 CSV 1줄 생성
        for (let rIndex = 0; rIndex < totalCount; rIndex++) {
            const rowData = records[rIndex];
            const rowValues = flatCells.map(({ td, colTracker }) => {
                const rawVal = extractRawCellValue(
                    td,
                    colTracker,
                    rowData,
                    rIndex,
                    fields,
                    exprEngine,
                    mode,
                    dataSourceCache
                );
                return extractPlainText(rawVal);
            });

            lines.push(this.#formatRow(rowValues));

            if (showProgress && (rIndex % 500 === 0 || rIndex === totalCount - 1)) {
                progress?.update(
                    rIndex + 1,
                    totalCount,
                    `processing CSV... ${(rIndex + 1).toLocaleString()} / ${totalCount.toLocaleString()}`
                );
                await new Promise((resolve) => setTimeout(resolve, 0));
            }
        }

        if (showProgress) {
            progress?.update(totalCount, totalCount, "downloading...");
        }

        const content = lines.join("\r\n");
        const payload = this.#bom ? `\uFEFF${content}` : content;
        const filename = buildExportFileName(this.#host, "csv", options);

        this.#triggerDownload(payload, filename);
        progress?.hide();
    };

    #formatRow(cells) {
        return cells.map((v) => this.#escapeCsvCell(v)).join(this.#delimiter);
    }

    #escapeCsvCell(val) {
        let str = val === null || val === undefined ? "" : String(val);
        const needsQuote =
            str.includes(this.#delimiter) ||
            str.includes('"') ||
            str.includes("\n") ||
            str.includes("\r");

        if (str.includes('"')) {
            str = str.replace(/"/g, '""');
        }

        return needsQuote ? `"${str}"` : str;
    }

    #triggerDownload(content, filename) {
        const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}