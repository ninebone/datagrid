import{n as e,r as t}from"./nine-table-D1DQCEp7.js";var n=(e=``)=>String(e).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#39;`),r=new Map(e.generateCommonCode(`DEPART`).map(e=>[e.code,e.codename])),i=new Map(e.generateCommonCode(`STATUS`).map(e=>[e.code,e.codename])),a={renderBadge:e=>e>50?`<span style="width: ${e}%; padding-left: 4px; display: block; background: #d1e7dd; color: #0f5132;">High</span>`:`<span style="width: ${e}%; padding-left: 4px; display: block; background: #f8d7da; color: #842029;">Low</span>`,formatCompactAmount:e=>{let t=Number(e);if(!Number.isFinite(t))return``;let n=Math.abs(t),r=t<0?`-`:``;return n>=1e9?`${r}${(n/1e9).toFixed(1).replace(/\.0$/,``)}B`:n>=1e6?`${r}${(n/1e6).toFixed(1).replace(/\.0$/,``)}M`:n>=1e3?`${r}${Math.round(n/1e3)}K`:`${r}${Math.round(n)}`},renderAmountBar:(e,t=`#3b82f6`,r=3e8)=>{let i=Number(e);if(!Number.isFinite(i))return``;let a=Math.abs(i),o=i<0?`-`:``,s=`${o}${Math.round(a)}`;a>=1e9?s=`${o}${(a/1e9).toFixed(1).replace(/\.0$/,``)}B`:a>=1e6?s=`${o}${(a/1e6).toFixed(1).replace(/\.0$/,``)}M`:a>=1e3&&(s=`${o}${Math.round(a/1e3)}K`);let c=Number(r)>0?Number(r):3e8,l=Math.min(Math.max(a/c,.08),1);return`
            <div style="position:relative; display:flex; align-items:center; justify-content:flex-end; width:100%; height:100%; overflow:hidden;">
                <span style="position:absolute; left:0; right:0; bottom:0; height:${Math.round(l*100)}%; background:${n(i<0?`#ef4444`:t)}; opacity:0.7; border-radius:2px 2px 0 0; pointer-events:none;"></span>
                <span style="position:relative; z-index:1; font-size:clamp(8px, 24cqh, 10px); line-height:1.1; white-space:nowrap; font-variant-numeric:tabular-nums;">${n(s)}</span>
            </div>
        `},renderSerialChart:(e=``,t=`#3b82f6`,...r)=>{let i=t||`#3b82f6`,a=(r||[]).map(e=>{let t=Number(e);return Number.isFinite(t)?t:0});if(a.length===0)return``;let o=Math.min(...a),s=Math.max(...a)-o,c=a.map((e,t)=>({x:t/(a.length>1?a.length-1:1)*100,y:22-(s===0?.5:(e-o)/s)*18-2})),l=`M ${c[0].x} ${c[0].y}`;for(let e=0;e<c.length-1;e++){let t=c[e],n=c[e+1],r=(t.x+n.x)/2;l+=` C ${r} ${t.y}, ${r} ${n.y}, ${n.x} ${n.y}`}let u=`${l} L 100 22 L 0 22 Z`,d=e?n(String(e)):``;return`
            <div style="display: flex; align-items: center; gap: 6px; width: 100%; height: 24px; padding: 0 6px; box-sizing: border-box; min-width: 0;">
                ${d?`<span style="flex-shrink: 0; font-size: clamp(8px, 22cqh, 10px); font-weight: 600; color: ${n(i)}; white-space: nowrap; line-height: 1.2;">${d}</span>`:``}
                <svg viewBox="0 0 100 22" style="flex: 1; min-width: 0; height: 22px; display: block; overflow: visible;" preserveAspectRatio="none">
                    <path d="${u}" fill="${n(i)}" opacity="0.15" />
                    <path d="${l}" fill="none" stroke="${n(i)}" stroke-width="2" stroke-linecap="round" />
                </svg>
            </div>
        `},renderProfileCard:(e={})=>{let t=n(e.NAME||`-`),a=r.get(e.DEPART)||e.DEPART,o=i.get(e.STATUS)||e.STATUS,s=n((e.NAME||`?`).trim().slice(0,1).toUpperCase()),c=e.STATUS===`C`?`#22c55e`:e.STATUS===`W`?`#f59e0b`:`#9ca3af`,l=`
            <span style="position:relative; width:clamp(22px, 64cqh, 36px); height:clamp(22px, 64cqh, 36px); flex-shrink:0; display:inline-flex; align-items:center; justify-content:center;">
                <span style="width:100%; height:100%; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:clamp(9px, 24cqh, 12px); font-weight:600; background:rgba(99,102,241,0.14); color:#6366f1;">${s}</span>
                ${e.PIC?`<img src="${n(e.PIC)}" alt="${t}" loading="lazy" onerror="this.remove()" style="position:absolute; inset:0; width:100%; height:100%; border-radius:50%; object-fit:cover;" />`:``}
                ${e.STATUS?`<span style="position:absolute; right:0; bottom:0; width:clamp(6px, 16cqh, 9px); height:clamp(6px, 16cqh, 9px); border-radius:50%; background:${c}; box-shadow:0 0 0 1.5px #ffffff;"></span>`:``}
            </span>
        `,u=[a&&`<span style="font-size: clamp(8px, 20cqh, 10px); line-height: 1.2; opacity: 0.65; font-weight: 400;">${n(a)}</span>`,e.EMAIL&&`<span style="font-size: clamp(8px, 20cqh, 10px); line-height: 1.2; opacity: 0.72; font-variant-numeric: tabular-nums;">${n(e.EMAIL)}</span>`].filter(Boolean).join(`<span style="font-size: clamp(8px, 20cqh, 10px); line-height: 1.2; opacity: 0.35; margin: 0 3px;">|</span>`);return`
            <div style="display:flex; padding: clamp(2px, 8cqh, 6px) 4px; align-items:center; gap:8px; width:100%; height:100%; box-sizing:border-box; line-height:1.2; min-width:0;">
                ${l}
                <div style="display:flex; flex-direction:column; justify-content:center; gap: clamp(1px, 6cqh, 6px); min-width:0; flex:1;">
                    <div style="display:flex; align-items:flex-end; justify-content:space-between; gap:6px; min-width:0;">
                        <span style="font-size: clamp(10.5px, 34cqh, 13px); font-weight:600; letter-spacing:-0.01em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; flex:1;">${t}</span>
                        ${o?`<span style="font-size: clamp(8px, 22cqh, 9.5px); color:${c}; font-weight:500; white-space:nowrap; flex-shrink:0;">${n(o)}</span>`:``}
                    </div>
                    ${u?`<div style="font-size: clamp(8px, 20cqh, 10px); line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0;">${u}</div>`:``}
                </div>
            </div>
        `},getMessageText:async(e,n)=>(await t(e))[n]||n};export{a as t};