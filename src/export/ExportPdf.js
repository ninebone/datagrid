import { trace } from "@nopeer";
import { buildExportFileName } from "./TableExportExtractor.js";

export class ExportPdf {
    #host;
    #maxSafeRows;

    constructor(host, { maxSafeRows = 2500 } = {}) {
        this.#host = host;
        this.#maxSafeRows = maxSafeRows;
    }

    export = async (options = {}, extractSheetModel, progress = null) => {
        const allSheets = Array.from(this.#host.shadowRoot?.querySelectorAll("nine-table-sheet") || []);
        const activeSheet = allSheets.find((s) => s.classList.contains("active")) || allSheets[0];

        if (!activeSheet) {
            await nine.alert("No sheets available to export.");
            return;
        }

        const sheets = [activeSheet];
        const targetRowCount = activeSheet.view?.count?.() ?? activeSheet.view?.getArray?.()?.length ?? 0;

        if (targetRowCount > this.#maxSafeRows) {
            const proceed = await nine.confirm(
                `There are ${targetRowCount.toLocaleString()} rows of data.\nPrinting more than ${this.#maxSafeRows.toLocaleString()} rows as PDF may slow down or freeze the browser. Do you want to continue?`
            );
            if (!proceed) return;
        }

        // 비동기 처리 전에 새 창을 먼저 확보 (팝업 차단 방지)
        // Open a new window before async processing to prevent popup blocking
        const printWin = window.open("", "_blank", "width=1100,height=800,scrollbars=yes,resizable=yes");
        if (printWin) {
            printWin.document.open();
            printWin.document.write(`
                <!DOCTYPE html>
                <html><head><meta charset="utf-8" /><title>Preparing PDF...</title></head>
                <body style="font-family:sans-serif;padding:24px;color:#475569;">Generating print document...</body>
                </html>
            `);
            printWin.document.close();
        }

        const showProgress = targetRowCount > 500;
        if (showProgress) {
            progress?.show(sheets.length, "preparing PDF...", 1);
        }

        const sheetSections = [];
        for (let i = 0; i < sheets.length; i++) {
            const sheet = sheets[i];
            const sheetId = sheet.getAttribute("data-sheet-id") || `Sheet${i + 1}`;
            const viewItems = sheet.view?.getArray?.() || [];

            if (showProgress) {
                progress?.show(sheets.length, `processing [${sheetId}]... (${i + 1} / ${sheets.length})`, i + 1);
                progress?.update(i + 1, sheets.length, `processing [${sheetId}]... (${i + 1} / ${sheets.length})`);
                await new Promise((resolve) => setTimeout(resolve, 0));
            }

            const model = await extractSheetModel(sheet, viewItems, {
                ...options,
                excelMode: "expr",
                preserveHtml: true,
            });
            if (!model) continue;

            sheetSections.push(this.#renderSheetSection(model, i, sheets.length > 1, options));
        }

        if (sheetSections.length === 0) {
            progress?.hide();
            if (printWin && !printWin.closed) printWin.close();
            await nine.alert("No sheets available to export.");
            return;
        }

        if (showProgress) {
            progress?.update(sheets.length, sheets.length, "opening print dialog...");
        }

        const title = buildExportFileName(this.#host, "", options);
        const orientation = options.pdfOrientation === "portrait" ? "portrait" : "landscape";
        this.#openPrintWindow(title, orientation, sheetSections.join("\n"), progress, printWin);
    };

    #renderSheetSection(model, sheetIndex, showTitle, options) {
        const { sheetId, colWidths, headerRows, bodyRows, footerRows } = model;

        const colgroupHtml = colWidths.length
            ? `<colgroup>${colWidths.map((w) => `<col style="width:${w}px;" />`).join("")}</colgroup>`
            : "";

        const theadHtml = headerRows.length
            ? `<thead>${headerRows.map((row) => this.#renderRowHtml(row, "th", options.applyHeader)).join("")}</thead>`
            : "";

        const tbodyHtml = `<tbody>${bodyRows.map((row) => this.#renderRowHtml(row, "td")).join("")}</tbody>`;

        const tfootHtml = footerRows.length
            ? `<tfoot>${footerRows.map((row) => this.#renderRowHtml(row, "td", options.applyHeader)).join("")}</tfoot>`
            : "";

        return `
            <section class="sheet-section ${sheetIndex > 0 ? "page-break" : ""}">
                ${showTitle ? `<div class="sheet-title">${this.#escapeHtml(sheetId)}</div>` : ""}
                <table>
                    ${colgroupHtml}
                    ${theadHtml}
                    ${tbodyHtml}
                    ${tfootHtml}
                </table>
            </section>
        `;
    }

    #renderRowHtml(cells, defaultTag, applyStyle = true) {
        const isGroupRow = Boolean(cells.isGroup);
        const groupDepth = cells.groupDepth ?? 0;

        const tds = cells
            .filter((c) => !c.skip)
            .map((c) => {
                const tag = c.tag || defaultTag;
                const attrs = [];
                if (c.colSpan > 1) attrs.push(`colspan="${c.colSpan}"`);
                if (c.rowSpan > 1) attrs.push(`rowspan="${c.rowSpan}"`);

                const align = c.align || (tag === "th" ? "center" : "left");
                const styles = [`text-align:${align};`];
                if (!applyStyle) {
                    styles.push("background:transparent;border-color:#e5e7eb;font-weight:normal;");
                }
                attrs.push(`style="${styles.join(" ")}"`);

                const raw = c.value === null || c.value === undefined ? "" : String(c.value);
                const content = c.isHtml ? raw : this.#escapeHtml(raw);
                return `<${tag} ${attrs.join(" ")}>${content}</${tag}>`;
            })
            .join("");

        const rowClass = isGroupRow ? ` class="group-row group-depth-${groupDepth}"` : "";
        return `<tr${rowClass}>${tds}</tr>`;
    }

    #escapeHtml(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    #openPrintWindow(title, orientation, bodyHtml, progress = null, existingWin = null) {
        let win = existingWin && !existingWin.closed ? existingWin : null;
        let iframe = null;

        // 팝업이 차단된 경우에만 기존 hidden iframe으로 폴백
        if (!win) {
            iframe = document.createElement("iframe");
            iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
            document.body.appendChild(iframe);
            win = iframe.contentWindow;
        }

        const isPopup = !iframe;
        const toolbarHtml = isPopup
            ? `<div class="no-print" style="position:sticky;top:0;z-index:10;display:flex;justify-content:space-between;align-items:center;padding:10px 16px;background:#1e293b;color:#fff;margin-bottom:12px;">
                <span style="font-size:13px;font-weight:600;">${this.#escapeHtml(title)}</span>
                <div style="display:flex;gap:8px;">
                    <button onclick="window.print()" style="padding:6px 14px;background:#3b82f6;color:#fff;border:0;border-radius:4px;cursor:pointer;font-weight:600;">Print / Save as PDF</button>
                    <button onclick="window.close()" style="padding:6px 12px;background:#475569;color:#fff;border:0;border-radius:4px;cursor:pointer;">Close</button>
                </div>
               </div>`
            : "";

        const doc = win.document;
        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8" />
                <title>${this.#escapeHtml(title)}</title>
                <style>
                    @page {
                        size: A4 ${orientation};
                        margin: 10mm;
                    }
                    @media print {
                        .no-print { display: none !important; }
                    }
                    * {
                        box-sizing: border-box;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    body {
                        margin: ${isPopup ? "0 16px 24px" : "0"};
                        font-family: -apple-system, BlinkMacSystemFont, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif;
                        font-size: 10px;
                        color: #111827;
                    }
                    .page-break {
                        break-before: page;
                        page-break-before: always;
                    }
                    .sheet-title {
                        font-size: 12px;
                        font-weight: 700;
                        margin-bottom: 6px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        table-layout: fixed;
                    }
                    thead { display: table-header-group; }
                    tfoot { display: table-footer-group; }
                    tr { break-inside: avoid; page-break-inside: avoid; }
                    th, td {
                        border: 1px solid #cbd5e1;
                        padding: 4px 6px;
                        line-height: 1.35;
                        word-break: break-word;
                        overflow-wrap: anywhere;
                        vertical-align: middle;
                    }
                    th { background: #f1f5f9; font-weight: 600; }
                    tr.group-row td { background: #f8fafc; font-weight: 700; }
                    tr.group-row.group-depth-0 td { background: #f1f5f9; }
                    tfoot td { background: #f8fafc; font-weight: 600; }
                    svg, img { max-width: 100%; }
                </style>
            </head>
            <body>
                ${toolbarHtml}
                ${bodyHtml}
            </body>
            </html>
        `);
        doc.close();

        const cleanup = () => {
            if (iframe) {
                setTimeout(() => {
                    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
                }, 500);
            }
        };

        if (iframe) {
            win.addEventListener("afterprint", cleanup, { once: true });
        }

        const images = Array.from(doc.images || []);
        const imagePromises = images.map((img) =>
            img.complete
                ? Promise.resolve()
                : new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve;
                })
        );

        Promise.all(imagePromises).then(() => {
            progress?.hide();
            win.focus();
            setTimeout(() => {
                win.print();
                cleanup();
            }, 150);
        });
    }
}