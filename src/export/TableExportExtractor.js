import { ExprEngine } from "@/core/ExprEngine.js";
import { GROUP_IDX } from "@/data/Grouping.js";

export function extractPlainText(rawVal) {
    if (rawVal === null || rawVal === undefined) return "";
    if (typeof rawVal === "number" || typeof rawVal === "boolean") return rawVal;
    if (typeof rawVal !== "string") return String(rawVal);

    const trimmed = rawVal.trim();
    if (!trimmed) return "";

    let text = trimmed;
    if (trimmed.includes("<") && trimmed.includes(">")) {
        const temp = document.createElement("div");
        temp.innerHTML = trimmed;
        text = (temp.textContent || temp.innerText || "").trim();
    }

    text = text.replace(/\s+/g, " ").trim();

    const numericCandidate = text.replace(/,/g, "");
    if (numericCandidate !== "" && !Number.isNaN(Number(numericCandidate)) && /^-?\d+(\.\d+)?$/.test(numericCandidate)) {
        return Number(numericCandidate);
    }

    return text;
}

export function getCodeMapForCell(td, exprEngine, rowData, rIndex, dataSourceCache) {
    const dataSourceAttr = td.getAttribute("data-source");
    if (!dataSourceAttr) return null;

    const keyName = td.getAttribute("key-name") || "value";
    const valueName = td.getAttribute("value-name") || "label";

    const isRowDependent = /\b(data|rowItem|row)\b/.test(dataSourceAttr);
    const cacheKey = `${dataSourceAttr}::${keyName}::${valueName}`;

    if (!isRowDependent && dataSourceCache.has(cacheKey)) {
        return dataSourceCache.get(cacheKey);
    }

    let list = exprEngine.evaluate(dataSourceAttr, rowData, rIndex, false);
    if (typeof list === "string") {
        try {
            list = JSON.parse(list);
        } catch (_) {}
    }

    if (!Array.isArray(list)) {
        if (!isRowDependent) dataSourceCache.set(cacheKey, null);
        return null;
    }

    const codeMap = new Map();
    for (const item of list) {
        if (item && typeof item === "object") {
            const k = item[keyName] ?? item.value ?? item.key ?? item.code;
            const v = item[valueName] ?? item.label ?? item.text ?? item.name ?? k;
            if (k !== undefined && k !== null) {
                codeMap.set(String(k), v);
            }
        } else if (item !== undefined && item !== null) {
            codeMap.set(String(item), item);
        }
    }

    if (!isRowDependent) {
        dataSourceCache.set(cacheKey, codeMap);
    }

    return codeMap;
}

export function resolveComboOrRadioLabel(rawVal, td, exprEngine, rowData, rIndex, dataSourceCache) {
    if (rawVal === null || rawVal === undefined || rawVal === "") return rawVal;

    const codeMap = getCodeMapForCell(td, exprEngine, rowData, rIndex, dataSourceCache);
    if (!codeMap || codeMap.size === 0) return rawVal;

    const mapSingle = (val) => {
        if (val === null || val === undefined) return "";
        const strKey = String(val);
        if (!codeMap.has(strKey)) return val;
        const mapped = codeMap.get(strKey);
        return mapped !== undefined && mapped !== null && mapped !== "" ? mapped : val;
    };

    return Array.isArray(rawVal) ? rawVal.map(mapSingle).join(", ") : mapSingle(rawVal);
}

export function resolveCheckboxLabel(rawVal, td) {
    if (rawVal === null || rawVal === undefined || rawVal === "") return rawVal;

    const hasTrueText = td.hasAttribute("true-text");
    const hasFalseText = td.hasAttribute("false-text");
    if (!hasTrueText && !hasFalseText) return rawVal;

    const trueValue = td.getAttribute("true-value") || "Y";
    const falseValue = td.getAttribute("false-value") || "N";
    const strVal = String(rawVal);

    if (strVal === trueValue && hasTrueText) {
        return td.getAttribute("true-text") ?? "";
    }
    if (strVal === falseValue && hasFalseText) {
        return td.getAttribute("false-text") ?? "";
    }

    return rawVal;
}

function isCellVisible(td, exprEngine, rowData, rIndex) {
    const visibleAttr = td.getAttribute("visible");
    if (!visibleAttr) return true;
    const res = exprEngine.evaluate(visibleAttr, rowData, rIndex, false);
    return res !== false && res !== "false";
}

export function extractRawCellValue(td, colIndex, rowData, rIndex, fields, exprEngine, mode, dataSourceCache) {
    if (!isCellVisible(td, exprEngine, rowData, rIndex)) {
        return "";
    }

    const dataExpr = td.getAttribute("data-expr");
    const dataBind = td.getAttribute("data-bind");
    let rawVal = "";

    if (mode === "expr" && dataExpr) {
        rawVal = exprEngine.evaluate(dataExpr, rowData, rIndex, false);
    } else if (dataBind && rowData) {
        if (Array.isArray(rowData.v)) {
            const fIdx = fields.indexOf(dataBind);
            rawVal = fIdx >= 0 ? rowData.v[fIdx] : (rowData[dataBind] ?? "");
        } else {
            rawVal = rowData[dataBind] !== undefined ? rowData[dataBind] : (rowData.v?.[dataBind] ?? "");
        }
    } else {
        const fieldKey = fields[colIndex - 1];
        if (fieldKey && rowData && Array.isArray(rowData.v)) {
            const fIdx = fields.indexOf(fieldKey);
            rawVal = fIdx >= 0 ? rowData.v[fIdx] : (rowData[fieldKey] ?? "");
        } else if (fieldKey && rowData && rowData[fieldKey] !== undefined) {
            rawVal = rowData[fieldKey];
        } else if (rowData && Array.isArray(rowData.v) && rowData.v[colIndex - 1] !== undefined) {
            rawVal = rowData.v[colIndex - 1];
        } else if (mode === "expr" && td.innerText) {
            rawVal = td.innerText;
        }
    }

    if (mode === "expr") {
        const cellType = (td.getAttribute("cell-type") || "").toLowerCase();
        if (cellType === "combo" || cellType === "radio") {
            rawVal = resolveComboOrRadioLabel(rawVal, td, exprEngine, rowData, rIndex, dataSourceCache);
        } else if (cellType === "checkbox") {
            rawVal = resolveCheckboxLabel(rawVal, td);
        }
    }

    return rawVal;
}

export function extractGroupCellValue(td, groupItem, groupColName, childrenRecords, exprEngine, mode) {
    const dataExpr = td.getAttribute("data-expr");
    const dataBind = td.getAttribute("data-bind");
    const groupRecord = groupItem.record;
    const groupName = groupRecord[GROUP_IDX.NAME] ?? "";
    const childCount = childrenRecords.length;

    if (dataBind && dataBind === groupColName && !dataExpr) {
        return mode === "expr" ? `${groupName} (${childCount})` : groupName;
    }

    if (mode === "expr" && dataExpr) {
        if (Array.isArray(childrenRecords)) {
            childrenRecords.childrenItems = childrenRecords;
            childrenRecords.groupName = groupName;
            childrenRecords.groupDepth = groupRecord[GROUP_IDX.DEPTH];
            childrenRecords.count = childCount;
        }
        return exprEngine.evaluate(dataExpr, childrenRecords, -1, false);
    }

    return "";
}

function buildCellOutput(rawVal, cellEl, preserveHtml) {
    const isHtmlCell = preserveHtml && (
        cellEl.getAttribute("html") === "true" ||
        (typeof rawVal === "string" && rawVal.includes("<") && rawVal.includes(">"))
    );

    if (isHtmlCell) {
        return {
            value: rawVal == null ? "" : String(rawVal),
            isHtml: true,
        };
    }

    return {
        value: extractPlainText(rawVal),
        isHtml: false,
    };
}

export async function extractSheetModel(sheet, data, options = {}) {
    const sourceTable = sheet.source?.table;
    if (!sourceTable) return null;

    const sheetId = sheet.getAttribute("data-sheet-id") || "Sheet";
    const sheetHost = sheet.host || sheet.getRootNode()?.host;
    const exprEngine = sheet.exprEngine || sheetHost?.exprEngine || new ExprEngine(sheetHost);
    const dataSourceCache = new Map();
    const mode = options.excelMode || "expr";
    const preserveHtml = Boolean(options.preserveHtml);

    const colWidths = [];
    sourceTable.querySelectorAll("colgroup col").forEach((colEl) => {
        const rawWidth = colEl.getAttribute("width") || colEl.style?.width || "";
        const match = String(rawWidth).match(/([\d.]+)/);
        colWidths.push(match ? parseFloat(match[1]) : 100);
    });

    const headerRows = [];
    const headerTrs = Array.from(sourceTable.querySelectorAll("thead tr"))
        .filter((tr) => !tr.classList.contains("col-indicator-rowgroup"));

    headerTrs.forEach((tr) => {
        const rowCells = [];
        tr.querySelectorAll("th, td").forEach((th) => {
            const colSpan = parseInt(th.getAttribute("colspan") || th.getAttribute("colSpan"), 10) || 1;
            const rowSpan = parseInt(th.getAttribute("rowspan") || th.getAttribute("rowSpan"), 10) || 1;
            const dataExpr = th.getAttribute("data-expr");

            let headerVal = preserveHtml && th.innerHTML.includes("<br")
                ? th.innerHTML
                : th.innerText;

            if (mode === "expr" && dataExpr) {
                headerVal = exprEngine.evaluate(dataExpr, null, -1, false);
            }

            const cellOut = buildCellOutput(headerVal, th, preserveHtml);
            rowCells.push({
                tag: "th",
                value: cellOut.value,
                isHtml: cellOut.isHtml,
                colSpan,
                rowSpan,
                align: "center",
            });
        });
        headerRows.push(rowCells);
    });

    const fields = sheet.fields?.get?.() || sheetHost?.fields?.get?.() || [];
    const isGroupBy = Boolean(sheet.isGroupBy);
    const viewItems = sheet.view?.getArray?.() || data;

    const groupTrs = Array.from(sourceTable.querySelectorAll("tbody tr[group-by]"));
    const bodyTrs = Array.from(sourceTable.querySelectorAll("tbody tr:not([group-by])"));
    const bodyRows = [];

    for (let rIndex = 0; rIndex < viewItems.length; rIndex++) {
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

        targetTrs.forEach((tr) => {
            const rowCells = [];
            let colTracker = 1;
            tr.querySelectorAll("td, th").forEach((td) => {
                const colSpan = parseInt(td.getAttribute("colspan") || td.getAttribute("colSpan"), 10) || 1;
                const rowSpan = parseInt(td.getAttribute("rowspan") || td.getAttribute("rowSpan"), 10) || 1;
                const rawVal = isGroupRow
                    ? extractGroupCellValue(td, item, groupColName, childrenRecords, exprEngine, mode)
                    : extractRawCellValue(td, colTracker, rowData, rIndex, fields, exprEngine, mode, dataSourceCache);
                const cellOut = buildCellOutput(rawVal, td, preserveHtml);

                rowCells.push({
                    tag: "td",
                    value: cellOut.value,
                    isHtml: cellOut.isHtml,
                    colSpan,
                    rowSpan,
                    align: td.getAttribute("text-align") || td.style?.textAlign || "left",
                });
                colTracker += colSpan;
            });

            rowCells.isGroup = isGroupRow;
            rowCells.groupDepth = isGroupRow ? item.record[GROUP_IDX.DEPTH] : -1;
            bodyRows.push(rowCells);
        });
    }

    const footerRows = [];
    if (options.includeFooter) {
        sourceTable.querySelectorAll("tfoot tr").forEach((tr) => {
            const rowCells = [];
            tr.querySelectorAll("th, td").forEach((th) => {
                const dataExpr = th.getAttribute("data-expr");
                let footerVal = th.innerText;
                if (mode === "expr" && dataExpr) {
                    footerVal = exprEngine.evaluate(dataExpr, data, data.length, true);
                }
                const colSpan = parseInt(th.getAttribute("colspan") || th.getAttribute("colSpan"), 10) || 1;
                const rowSpan = parseInt(th.getAttribute("rowspan") || th.getAttribute("rowSpan"), 10) || 1;
                const cellOut = buildCellOutput(footerVal, th, preserveHtml);

                rowCells.push({
                    tag: "td",
                    value: cellOut.value,
                    isHtml: cellOut.isHtml,
                    colSpan,
                    rowSpan,
                    align: "center",
                });
            });
            footerRows.push(rowCells);
        });
    }

    return { sheetId, colWidths, headerRows, bodyRows, footerRows };
}

function formatTimestamp(date = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = date.getFullYear();
    const MM = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const HH = pad(date.getHours());
    const mm = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `${yyyy}${MM}${dd}_${HH}${mm}${ss}`;
}

export function buildExportFileName(host, ext = "", options = {}) {
    const rawName =
        (options.fileName && String(options.fileName).trim()) ||
        (host?.getAttribute("caption") && host.getAttribute("caption").trim()) ||
        "export";

    const cleanExt = ext ? (ext.startsWith(".") ? ext : `.${ext}`) : "";

    let baseName = rawName.replace(/[`~!@#$%^&*|\\'";:/?<>]/g, "").trim();
    if (cleanExt && baseName.toLowerCase().endsWith(cleanExt.toLowerCase())) {
        baseName = baseName.slice(0, -cleanExt.length);
    }

    const sanitized = baseName.replace(/\s+/g, "_").trim() || "export";
    const timestamp = options.timestamp ?? formatTimestamp();
    const stampedName = timestamp ? `${sanitized}_${timestamp}` : sanitized;

    return cleanExt ? `${stampedName}${cleanExt}` : stampedName;
}