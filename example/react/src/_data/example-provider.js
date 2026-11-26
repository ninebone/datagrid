import { exampleData, fetchMessages } from '@/_data/example-data.js';

const escapeHtml = (value = '') =>
    String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

const departMap = new Map(
    exampleData.generateCommonCode('DEPART').map((item) => [item.code, item.codename])
);

const statusMap = new Map(
    exampleData.generateCommonCode('STATUS').map((item) => [item.code, item.codename])
);

export const exampleProvider = {
    renderBadge: (v) => {
       // const v = (Number(v1) + Number(v2) + Number(v3)) / 3;
        return v > 50
            ? `<span style="width: ${v}%; padding-left: 4px; display: block; background: #d1e7dd; color: #0f5132;">High</span>`
            : `<span style="width: ${v}%; padding-left: 4px; display: block; background: #f8d7da; color: #842029;">Low</span>`;
    },
    renderBar: (count, color, max = 31, reverse = false) => {
        const value = Number(count) || 0;
        const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));

        const numEl = `<span style="color: ${color}; font-weight: 700; font-size: 9px; min-width: 16px; text-align: ${reverse ? 'right' : 'left'};">${value}</span>`;
        const barEl = `
            <div style="flex: 1; display: flex; background: rgba(148, 163, 184, 0.25); height: 6px; border-radius: 3px; overflow: hidden;">
                <div style="width: ${pct}%; height: 100%; background: ${color}; ${reverse ? 'margin-left: auto;' : ''}"></div>
            </div>
        `;

        return `
            <div style="display: flex; align-items: center; gap: 6px; width: 100%;">
                ${reverse ? `${numEl}${barEl}` : `${barEl}${numEl}`}
            </div>
        `;
    },
    formatCompactAmount: (val) => {
        const num = Number(val);
        if (!Number.isFinite(num)) return '';
        const abs = Math.abs(num);
        const sign = num < 0 ? '-' : '';
        if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
        if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
        if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)}K`;
        return `${sign}${Math.round(abs)}`;
    },
    renderAmountBar: (val, color = '#3b82f6', max = 300_000_000) => {

        const num = Number(val);
        if (!Number.isFinite(num)) return '';

        const abs = Math.abs(num);
        const sign = num < 0 ? '-' : '';

        let compact = `${sign}${Math.round(abs)}`;
        if (abs >= 1_000_000_000) compact = `${sign}${(abs / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
        else if (abs >= 1_000_000) compact = `${sign}${(abs / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
        else if (abs >= 1_000) compact = `${sign}${Math.round(abs / 1_000)}K`;

        const safeMax = Number(max) > 0 ? Number(max) : 300_000_000;
        const ratio = Math.min(Math.max(abs / safeMax, 0.08), 1);
        const barHeightPct = Math.round(ratio * 100);
        const barColor = num < 0 ? '#ef4444' : color;

        return `
            <div style="position:relative; display:flex; align-items:center; justify-content:flex-end; width:100%; height:100%; overflow:hidden;">
                <span style="position:absolute; left:0; right:0; bottom:0; height:${barHeightPct}%; background:${escapeHtml(barColor)}; opacity:0.7; border-radius:2px 2px 0 0; pointer-events:none;"></span>
                <span style="position:relative; z-index:1; font-size:clamp(8px, 24cqh, 10px); line-height:1.1; white-space:nowrap; font-variant-numeric:tabular-nums;">${escapeHtml(compact)}</span>
            </div>
        `;
    },
    renderSerialChart: (label = '', color = '#3b82f6', ...values) => {
        const strokeColor = color || '#3b82f6';
        const width = 100;
        const height = 22;

        const nums = (values || []).map((v) => {
            const n = Number(v);
            return Number.isFinite(n) ? n : 0;
        });
        if (nums.length === 0) return '';

        const minVal = Math.min(...nums);
        const maxVal = Math.max(...nums);
        const span = maxVal - minVal;

        const points = nums.map((v, index) => {
            const x = (index / (nums.length > 1 ? nums.length - 1 : 1)) * width;
            const ratio = span === 0 ? 0.5 : (v - minVal) / span;
            const y = height - ratio * (height - 4) - 2;
            return { x, y };
        });

        let pathData = `M ${points[0].x} ${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];
            const cpX = (p0.x + p1.x) / 2;
            pathData += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
        }

        const areaData = `${pathData} L ${width} ${height} L 0 ${height} Z`;
        const safeLabel = label ? escapeHtml(String(label)) : '';

        return `
            <div style="display: flex; align-items: center; gap: 6px; width: 100%; height: 24px; padding: 0 6px; box-sizing: border-box; min-width: 0;">
                ${safeLabel ? `<span style="flex-shrink: 0; font-size: clamp(8px, 22cqh, 10px); font-weight: 600; color: ${escapeHtml(strokeColor)}; white-space: nowrap; line-height: 1.2;">${safeLabel}</span>` : ''}
                <svg viewBox="0 0 ${width} ${height}" style="flex: 1; min-width: 0; height: 22px; display: block; overflow: visible;" preserveAspectRatio="none">
                    <path d="${areaData}" fill="${escapeHtml(strokeColor)}" opacity="0.15" />
                    <path d="${pathData}" fill="none" stroke="${escapeHtml(strokeColor)}" stroke-width="2" stroke-linecap="round" />
                </svg>
            </div>
        `;
    },
    renderProfileCard: (data = {}) => {
        const name = escapeHtml(data.NAME || '-');
        const depart = departMap.get(data.DEPART) || data.DEPART;
        const status = statusMap.get(data.STATUS) || data.STATUS;
        const initial = escapeHtml((data.NAME || '?').trim().slice(0, 1).toUpperCase());

        const dotColor =
            data.STATUS === 'C' ? '#22c55e' :
                data.STATUS === 'W' ? '#f59e0b' : '#9ca3af';

        const avatar = `
            <span style="position:relative; width:clamp(22px, 64cqh, 36px); height:clamp(22px, 64cqh, 36px); flex-shrink:0; display:inline-flex; align-items:center; justify-content:center;">
                <span style="width:100%; height:100%; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:clamp(9px, 24cqh, 12px); font-weight:600; background:rgba(99,102,241,0.14); color:#6366f1;">${initial}</span>
                ${data.PIC ? `<img src="${escapeHtml(data.PIC)}" alt="${name}" loading="lazy" onerror="this.remove()" style="position:absolute; inset:0; width:100%; height:100%; border-radius:50%; object-fit:cover;" />` : ''}
                ${data.STATUS ? `<span style="position:absolute; right:0; bottom:0; width:clamp(6px, 16cqh, 9px); height:clamp(6px, 16cqh, 9px); border-radius:50%; background:${dotColor}; box-shadow:0 0 0 1.5px #ffffff;"></span>` : ''}
            </span>
        `;

        const meta = [
            depart && `<span style="font-size: clamp(8px, 20cqh, 10px); line-height: 1.2; opacity: 0.65; font-weight: 400;">${escapeHtml(depart)}</span>`,
            data.EMAIL && `<span style="font-size: clamp(8px, 20cqh, 10px); line-height: 1.2; opacity: 0.72; font-variant-numeric: tabular-nums;">${escapeHtml(data.EMAIL)}</span>`,
        ].filter(Boolean).join('<span style="font-size: clamp(8px, 20cqh, 10px); line-height: 1.2; opacity: 0.35; margin: 0 3px;">|</span>');

        return `
            <div style="display:flex; padding: clamp(2px, 8cqh, 6px) 4px; align-items:center; gap:8px; width:100%; height:100%; box-sizing:border-box; line-height:1.2; min-width:0;">
                ${avatar}
                <div style="display:flex; flex-direction:column; justify-content:center; gap: clamp(1px, 6cqh, 6px); min-width:0; flex:1;">
                    <div style="display:flex; align-items:flex-end; justify-content:space-between; gap:6px; min-width:0;">
                        <span style="font-size: clamp(10.5px, 34cqh, 13px); font-weight:600; letter-spacing:-0.01em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; flex:1;">${name}</span>
                        ${status ? `<span style="font-size: clamp(8px, 22cqh, 9.5px); color:${dotColor}; font-weight:500; white-space:nowrap; flex-shrink:0;">${escapeHtml(status)}</span>` : ''}
                    </div>
                    ${meta ? `<div style="font-size: clamp(8px, 20cqh, 10px); line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0;">${meta}</div>` : ''}
                </div>
            </div>
        `;
    },

    getMessageText: async (lang, code) => {
        const map = await fetchMessages(lang);
        return map[code] || code;
    },
};