import { ExprEngine } from "@/core/ExprEngine.js";
import { GROUP_IDX } from "@/data/Grouping.js";
import {
    extractPlainText,
    extractRawCellValue,
    extractGroupCellValue,
    buildExportFileName,
} from "./TableExportExtractor.js";

function calcRowHeight(rowItems, worksheet, baseHeight = 22, lineHeight = 15, padding = 6) {
    let maxLines = 1;

    for (const { colIndex, value, colSpan = 1 } of rowItems) {
        if (value === null || value === undefined) continue;
        const text = String(value);
        if (!text) continue;

        let totalColWidth = 0;
        for (let c = 0; c < colSpan; c++) {
            totalColWidth += worksheet.getColumn(colIndex + c)?.width || 14;
        }

        const effectiveCharsPerLine = Math.max(4, Math.floor(totalColWidth * 0.85));
        const lines = text.split(/\r?\n/).reduce((sum, line) => {
            return sum + Math.max(1, Math.ceil(line.length / effectiveCharsPerLine));
        }, 0);

        if (lines > maxLines) {
            maxLines = lines;
        }
    }

    return Math.max(baseHeight, maxLines * lineHeight + padding);
}

function resolveTdHorizontalAlign(td) {
    const raw = td.getAttribute("text-align") || td.getAttribute("align") || td.style?.textAlign || "";
    const normalized = String(raw).toLowerCase().trim();
    if (normalized === "center" || normalized === "right" || normalized === "left") {
        return normalized;
    }
    if (normalized === "end") return "right";
    return "left";
}

export class ExportExcel {
    #host;

    constructor(host) {
        this.#host = host;
    }

    export = async (options = {}, progress = null) => {
        let ExcelJS;
        try {
            ExcelJS = await import("exceljs");
        } catch (e) {
            await nine.alert("The exceljs package is not installed.\nInstall command: npm i exceljs");
            return;
        }

        let sheets = Array.from(this.#host.shadowRoot?.querySelectorAll("nine-table-sheet") || []);
        if (options.sheetTarget === "current") {
            const activeSheet = sheets.find((s) => s.classList.contains("active")) || sheets[0];
            sheets = activeSheet ? [activeSheet] : [];
        }

        if (sheets.length === 0) {
            progress?.hide();
            await nine.alert("No sheets available to export.");
            return;
        }

        const allSheetsRowCount = sheets.reduce(
            (sum, s) => sum + (s.view?.count?.() ?? s.view?.getArray?.()?.length ?? 0),
            0
        );
        const showProgress = allSheetsRowCount > 500;
        const fileName = buildExportFileName(this.#host, "xlsx", options);

        const getHeaderFill = () => ({
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFEEEEEE" },
        });

        const getHeaderBorder = () => ({
            top: { style: "thin", color: { argb: "FFCCCCCC" } },
            left: { style: "thin", color: { argb: "FFCCCCCC" } },
            right: { style: "thin", color: { argb: "FFCCCCCC" } },
            bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
        });

        const workbook = new ExcelJS.default.Workbook();

        let sheetIdx = 0;
        let lastSheetTotal = 0;

        for (const sheet of sheets) {
            sheetIdx++;
            const sourceTable = sheet.source?.table;
            if (!sourceTable) continue;

            const sheetId = sheet.getAttribute("data-sheet-id") || `Sheet${sheetIdx}`;
            const isGroupBy = Boolean(sheet.isGroupBy);
            const viewItems = sheet.view?.getArray?.() || [];
            const sheetTotalCount = viewItems.length;
            const isLargeDataset = sheetTotalCount > 5000;
            lastSheetTotal = sheetTotalCount;

            if (showProgress) {
                progress?.show(sheetTotalCount, `processing [${sheetId}]...`, sheetIdx);
            }

            const worksheet = workbook.addWorksheet(sheetId);

            const sheetHost = sheet.host || this.#host;
            const exprEngine = sheet.exprEngine || this.#host.exprEngine || new ExprEngine(sheetHost);
            const dataSourceCache = new Map();

            const mergedCellsMap = new Set();
            let currentRowIndex = 0;

            // 0. colgroup col 너비 적용
            const colElements = sourceTable.querySelectorAll("colgroup col");
            colElements.forEach((colEl, idx) => {
                const colIndex = parseInt(colEl.dataset.index, 10) || (idx + 1);
                const rawWidth = colEl.getAttribute("width") || colEl.style?.width || "";
                const match = String(rawWidth).match(/([\d.]+)/);
                if (match) {
                    const px = parseFloat(match[1]);
                    if (px > 0) {
                        const excelWidth = Math.max(6, Math.min(80, Number((px / 7.5).toFixed(1))));
                        worksheet.getColumn(colIndex).width = excelWidth;
                    }
                }
            });

            // 1. 헤더 처리 (col-indicator-rowgroup 제외)
            const headerTrs = Array.from(sourceTable.querySelectorAll("thead tr"))
                .filter((tr) => !tr.classList.contains("col-indicator-rowgroup"));

            headerTrs.forEach((tr, tIndex) => {
                const excelRow = tIndex + 1;
                currentRowIndex = Math.max(currentRowIndex, excelRow);
                const thElements = tr.querySelectorAll("th, td");
                const rowHeaderItems = [];
                let colTracker = 1;

                thElements.forEach((th) => {
                    let colIndex = parseInt(th.dataset.index, 10);
                    if (!colIndex) {
                        while (mergedCellsMap.has(`${excelRow},${colTracker}`)) {
                            colTracker++;
                        }
                        colIndex = colTracker;
                    }

                    if (mergedCellsMap.has(`${excelRow},${colIndex}`)) {
                        colTracker = colIndex + 1;
                        return;
                    }

                    const cell = worksheet.getCell(excelRow, colIndex);
                    const cellText = extractPlainText(th.innerText);
                    cell.value = cellText;
                    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

                    if (options.applyHeader) {
                        cell.fill = getHeaderFill();
                        cell.border = getHeaderBorder();
                        cell.font = { size: 10, bold: true };
                    }

                    const colSpan = parseInt(th.getAttribute("colspan") || th.getAttribute("colSpan"), 10) || 1;
                    const rowSpan = parseInt(th.getAttribute("rowspan") || th.getAttribute("rowSpan"), 10) || 1;

                    if (rowSpan === 1) {
                        rowHeaderItems.push({ colIndex, value: cellText, colSpan });
                    }

                    if (colSpan > 1 || rowSpan > 1) {
                        const startRow = excelRow;
                        const endRow = excelRow + rowSpan - 1;
                        const startCol = colIndex;
                        const endCol = colIndex + colSpan - 1;

                        for (let r = startRow; r <= endRow; r++) {
                            for (let c = startCol; c <= endCol; c++) {
                                mergedCellsMap.add(`${r},${c}`);
                            }
                        }
                        worksheet.mergeCells(startRow, startCol, endRow, endCol);
                    } else {
                        mergedCellsMap.add(`${excelRow},${colIndex}`);
                    }

                    colTracker = colIndex + colSpan;
                });

                worksheet.getRow(excelRow).height = calcRowHeight(rowHeaderItems, worksheet, 25, 16, 8);
            });

            const headerRowCount = currentRowIndex;
            const fields = sheet.fields?.get?.() || this.#host.fields?.get?.() || [];

            // 그룹 헤더 템플릿과 일반 데이터 템플릿 분리
            const groupTrs = Array.from(sourceTable.querySelectorAll("tbody tr[group-by]"));
            const bodyTrs = Array.from(sourceTable.querySelectorAll("tbody tr:not([group-by])"));

            if (headerRowCount > 0) {
                worksheet.views = [
                    {
                        state: "frozen",
                        xSplit: 0,
                        ySplit: headerRowCount,
                        topLeftCell: `A${headerRowCount + 1}`,
                        activeCell: `A${headerRowCount + 1}`,
                    },
                ];
            }

            const cellAlignMap = new WeakMap();
            [...groupTrs, ...bodyTrs].forEach((tr) => {
                tr.querySelectorAll("td, th").forEach((td) => {
                    cellAlignMap.set(td, {
                        horizontal: resolveTdHorizontalAlign(td),
                        vertical: "middle",
                        wrapText: true,
                    });
                });
            });

            // 2. 바디 데이터 처리 (sheet.view.getArray() 기준)
            for (let rIndex = 0; rIndex < sheetTotalCount; rIndex++) {
                const item = viewItems[rIndex];
                const isGroupRow = isGroupBy && item && item.type === "group";

                const targetTrs = isGroupRow
                    ? [groupTrs[item.record[GROUP_IDX.DEPTH]] || groupTrs[0]].filter(Boolean)
                    : bodyTrs;

                const rowData = isGroupBy ? item.record : item;
                const groupColName = isGroupRow
                    ? (targetTrs[0]?.getAttribute("group-by") || sheet.grouping?.columns?.[item.record[GROUP_IDX.DEPTH]] || "")
                    : "";
                const childrenRecords = isGroupRow
                    ? (sheet.grouping?.getChildrenRecords?.(item.groupId) || [])
                    : [];

                //trace.log(isGroupRow, childrenRecords);

                //const childrenRecords = indices ? indices.map(idx => this.#chchedAllRecords[idx]).filter(Boolean) : [];
                //trace.log(isGroupRow, childrenRecords);

                for (let trIdx = 0; trIdx < targetTrs.length; trIdx++) {
                    const tr = targetTrs[trIdx];
                    const currentExcelRow = ++currentRowIndex;

                    const tdElements = tr.querySelectorAll("td, th");
                    const rowBodyItems = [];
                    let colTracker = 1;

                    tdElements.forEach((td) => {
                        while (mergedCellsMap.has(`${currentExcelRow},${colTracker}`)) {
                            colTracker++;
                        }
                        const colIndex = colTracker;

                        if (mergedCellsMap.has(`${currentExcelRow},${colIndex}`)) {
                            colTracker = colIndex + 1;
                            return;
                        }

                        const cell = worksheet.getCell(currentExcelRow, colIndex);
                        const rawVal = isGroupRow
                            ? extractGroupCellValue(td, item, groupColName, childrenRecords, exprEngine, options.excelMode)
                            : extractRawCellValue(td, colIndex, rowData, rIndex, fields, exprEngine, options.excelMode, dataSourceCache);

                        const cellVal = extractPlainText(rawVal);
                        cell.value = cellVal;
                        cell.alignment = cellAlignMap.get(td) || {
                            horizontal: "left",
                            vertical: "middle",
                            wrapText: true,
                        };

                        if (isGroupRow) {
                            cell.font = { size: 10, bold: true };
                            cell.fill = {
                                type: "pattern",
                                pattern: "solid",
                                fgColor: { argb: item.record[GROUP_IDX.DEPTH] === 0 ? "FFF1F5F9" : "FFF8FAFC" },
                            };
                        }

                        const colSpan = parseInt(td.getAttribute("colspan") || td.getAttribute("colSpan"), 10) || 1;
                        const rowSpan = parseInt(td.getAttribute("rowspan") || td.getAttribute("rowSpan"), 10) || 1;

                        if (!isLargeDataset && rowSpan === 1) {
                            rowBodyItems.push({ colIndex, value: cellVal, colSpan });
                        }

                        if (colSpan > 1 || rowSpan > 1) {
                            const startRow = currentExcelRow;
                            const endRow = currentExcelRow + rowSpan - 1;
                            const startCol = colIndex;
                            const endCol = colIndex + colSpan - 1;

                            for (let r = startRow; r <= endRow; r++) {
                                for (let c = startCol; c <= endCol; c++) {
                                    mergedCellsMap.add(`${r},${c}`);
                                }
                            }
                            worksheet.mergeCells(startRow, startCol, endRow, endCol);
                        } else {
                            mergedCellsMap.add(`${currentExcelRow},${colIndex}`);
                        }

                        colTracker = colIndex + colSpan;
                    });

                    worksheet.getRow(currentExcelRow).height = isLargeDataset
                        ? 22
                        : calcRowHeight(rowBodyItems, worksheet, 22, 15, 6);
                }

                if (showProgress && (rIndex % 100 === 0 || rIndex === sheetTotalCount - 1)) {
                    progress?.update(
                        rIndex + 1,
                        sheetTotalCount,
                        `processing [${sheetId}]... ${(rIndex + 1).toLocaleString()} / ${sheetTotalCount.toLocaleString()}`
                    );
                    await new Promise((resolve) => setTimeout(resolve, 0));
                }
            }

            // 3. 푸터 처리 (현재 시트 뷰 데이터 기준)
            if (options.includeFooter) {
                const footerRecords = isGroupBy
                    ? this.#host.data.enhanceArray(
                        viewItems.filter((item) => item && item.type === "data").map((item) => item.record)
                    )
                    : viewItems;

                const footerTrs = sourceTable.querySelectorAll("tfoot tr");
                footerTrs.forEach((tr, fIndex) => {
                    const excelRow = currentRowIndex + fIndex + 1;
                    const thElements = tr.querySelectorAll("th, td");
                    const rowFooterItems = [];
                    let colTracker = 1;

                    thElements.forEach((th) => {
                        let colIndex = parseInt(th.dataset.index, 10);
                        if (!colIndex) {
                            while (mergedCellsMap.has(`${excelRow},${colTracker}`)) {
                                colTracker++;
                            }
                            colIndex = colTracker;
                        }

                        if (mergedCellsMap.has(`${excelRow},${colIndex}`)) {
                            colTracker = colIndex + 1;
                            return;
                        }

                        const cell = worksheet.getCell(excelRow, colIndex);
                        const dataExpr = th.getAttribute("data-expr");
                        let footerVal = th.innerText;
                        if (options.excelMode === "expr" && dataExpr) {
                            footerVal = exprEngine.evaluate(dataExpr, footerRecords, footerRecords.length, true);
                        }

                        const cleanFooterVal = extractPlainText(footerVal);
                        cell.value = cleanFooterVal;
                        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
                        cell.font = { size: 10, bold: true };

                        if (options.applyHeader) {
                            cell.fill = getHeaderFill();
                            cell.border = getHeaderBorder();
                        }

                        const colSpan = parseInt(th.getAttribute("colspan") || th.getAttribute("colSpan"), 10) || 1;
                        const rowSpan = parseInt(th.getAttribute("rowspan") || th.getAttribute("rowSpan"), 10) || 1;

                        if (rowSpan === 1) {
                            rowFooterItems.push({ colIndex, value: cleanFooterVal, colSpan });
                        }

                        if (colSpan > 1 || rowSpan > 1) {
                            const startRow = excelRow;
                            const endRow = excelRow + rowSpan - 1;
                            const startCol = colIndex;
                            const endCol = colIndex + colSpan - 1;

                            for (let r = startRow; r <= endRow; r++) {
                                for (let c = startCol; c <= endCol; c++) {
                                    mergedCellsMap.add(`${r},${c}`);
                                }
                            }
                            worksheet.mergeCells(startRow, startCol, endRow, endCol);
                        } else {
                            mergedCellsMap.add(`${excelRow},${colIndex}`);
                        }

                        colTracker = colIndex + colSpan;
                    });

                    worksheet.getRow(excelRow).height = calcRowHeight(rowFooterItems, worksheet, 24, 16, 6);
                });
            }
        }

        if (showProgress) {
            progress?.update(lastSheetTotal, lastSheetTotal, "downloading...");
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement("a");
        document.body.appendChild(a);
        a.href = url;
        a.download = fileName;
        a.click();

        setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            progress?.hide();
        }, 100);
    };
}