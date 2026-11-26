import{i as e,o as t,r as n}from"./index-DfxOSiKo.js";import{n as r}from"./nine-table-D1DQCEp7.js";var i=t(e(),1),a=n(),o=()=>{let e=(0,i.useRef)(null),t=(t={})=>{e.current.loading=!0,setTimeout(()=>{e.current.data.set(r.generateRandomTree(100))})},n=()=>{localStorage.setItem(`lang`,`en`),e.current.refresh()},o=()=>{localStorage.setItem(`lang`,`ko`),e.current.refresh()};return(0,i.useEffect)(()=>{e.current?.provider.add({getCommonCode:e=>r.generateCommonCode(e),getMessage:e=>r.getMessage(localStorage.getItem(`lang`),e),renderImage:(e,...t)=>{let n=t.map(e=>Number(e)||0),r=n.reduce((e,t)=>e+t,0),i=n.length>0?Math.round(r/n.length):0,a=2*Math.PI*14,o=Math.min(Math.max(i,0),100),s=a-o/100*a;return`
                <div style="display: flex; justify-content:center; align-items: center; gap: 8px; width: 100%;">
                   <img src="${e}" style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" />
                   <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; flex-shrink: 0;">
                     <svg width="36" height="36" viewBox="0 0 36 36" style="transform: rotate(-90deg);">
                       <circle cx="18" cy="18" r="14" fill="none" stroke="#e2e8f0" stroke-width="3" />
                       <circle cx="18" cy="18" r="14" fill="none" stroke="${o>50?`#10b981`:`#3b82f6`}" stroke-width="3" 
                         stroke-dasharray="${a}" stroke-dashoffset="${s}" stroke-linecap="round" />
                     </svg>
                     <div style="position: absolute; font-size: 10px; font-weight: 700; color: #1e293b;">
                       ${i}
                     </div>
                   </div>
                </div>
              `},renderBadge:(e,t,n)=>{let r=(Number(e)+Number(t)+Number(n))/3;return r>50?`<span style="width: ${r}%; padding-left: 4px; display: block; background: #d1e7dd; color: #0f5132;">High</span>`:`<span style="width: ${r}%; padding-left: 4px; display: block; background: #f8d7da; color: #842029;">Low</span>`},renderBadge2:(e,t)=>`
                <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
                   <span style="color: ${t}; font-weight: 700; min-width: 16px; text-align: right;">${e}</span>
                   <div style="flex: 1; background: #e2e8f0; height: 6px; border-radius: 3px; overflow: hidden;">
                      <div style="width: ${e}%; height: 100%; background: ${t};"></div>
                   </div>
                </div>
             `,renderBarChart:(...e)=>{let t=`#3b82f6`;if(!e||e.length===0)return``;let n=e.map((t,n)=>({x:n/(e.length>1?e.length-1:1)*100,y:22-Math.min(Math.max(t,0),100)/100*18-2})),r=`M ${n[0].x} ${n[0].y}`;for(let e=0;e<n.length-1;e++){let t=n[e],i=n[e+1],a=(t.x+i.x)/2;r+=` C ${a} ${t.y}, ${a} ${i.y}, ${i.x} ${i.y}`}return`
                <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 24px; padding: 0 4px; box-sizing: border-box;">
                   <svg viewBox="0 0 100 22" style="width: 100%; height: 22px; display: block; overflow: visible;" preserveAspectRatio="none">
                     <path d="${`${r} L 100 22 L 0 22 Z`}" fill="${t}" opacity="0.15" />
                     <path d="${r}" fill="none" stroke="${t}" stroke-width="2" stroke-linecap="round" />
                   </svg>
                </div>
             `},renderPieChart:(...e)=>{let t=[`#3b82f6`,`#10b981`,`#f59e0b`,`#ef4444`,`#8b5cf6`,`#ec4899`,`#06b6d4`,`#84cc16`,`#6366f1`,`#14b8a6`,`#f97316`,`#a855f7`],n=e.map(e=>Math.max(Number(e)||0,0)),r=n.reduce((e,t)=>e+t,0);if(r===0)return`
                   <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 56px;">
                      <svg width="56" height="56" viewBox="0 0 56 56">
                         <circle cx="28" cy="28" r="24" fill="#e2e8f0" />
                      </svg>
                   </div>
                `;let i=0;return`
                <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 56px;">
                   <svg width="56" height="56" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="24" fill="#e2e8f0" />
                      ${n.map((e,n)=>{if(e===0)return``;let a=e/r*360,o=i,s=i+a;i=s;let c=t[n%t.length];if(a>=360)return`<circle cx="28" cy="28" r="24" fill="${c}" />`;let l=(o-90)*(Math.PI/180),u=(s-90)*(Math.PI/180),d=28+24*Math.cos(l),f=28+24*Math.sin(l),p=28+24*Math.cos(u),m=28+24*Math.sin(u);return`<path d="${`M 28 28 L ${d} ${f} A 24 24 0 ${+(a>180)} 1 ${p} ${m} Z`}" fill="${c}" />`}).join(``)}
                   </svg>
                </div>
             `},summary:()=>{let t=e.current.data.getArray(),n=e.current.fields.get(),i=n.indexOf(`DEPART`),a=n.indexOf(`REC1`),o=n.indexOf(`REC2`),s=n.indexOf(`REC3`);if(i===-1)return`<div style="padding: 8px; font-size: 13px; color: #64748b;">DEPART field not found.</div>`;let c=r.generateCommonCode(`DEPART`),l=c.reduce((e,t)=>(e[t.code]=t.codename,e),{}),u=c.reduce((e,t,n)=>(e[t.code]=n,e),{}),d={},f=[`#0284c7`,`#059669`,`#d97706`,`#7c3aed`,`#db2777`,`#2563eb`];return t.forEach(e=>{let t=(e.v?e:e.record||{}).v||[],n=t[i]||`Unassigned`,r=l[n]||n;d[n]||(d[n]={code:n,name:r,count:0,rec1:0,rec2:0,rec3:0}),d[n].count+=1,d[n].rec1+=Number(t[a])||0,d[n].rec2+=Number(t[o])||0,d[n].rec3+=Number(t[s])||0}),`
                <div style="display: flex; align-items: center; overflow-x: auto; width: 100%; padding: 0px 12px; box-sizing: border-box; font-family: inherit; gap: 8px;">
                   <div style="display: flex; align-items: center; gap: 12px; overflow-x: auto; padding-bottom: 2px; width: 100%;">
                     ${Object.values(d).sort((e,t)=>(u[e.code]===void 0?999:u[e.code])-(u[t.code]===void 0?999:u[t.code])).map((e,t)=>{let n=e.rec1+e.rec2+e.rec3,r=f[t%f.length];return`
                   <div style="display: flex; align-items: center; gap: 6px; white-space: nowrap;">
                     <span style="width: 8px; height: 8px; border-radius: 50%; background: ${r}; display: inline-block;"></span>
                     <span style="font-size: 12px; font-weight: 700; color: #0f172a;">${e.name}</span>
                     <span style="font-size: 10px; color: #64748b; background: #f1f5f9; padding: 1px 5px; border-radius: 8px;">${e.count.toLocaleString()} rows</span>
                     <span style="font-size: 11px; color: #334155;">
                      Total: <b style="color: ${r};">${n.toLocaleString()}</b> 
                      <span style="color: #94a3b8; font-size: 10px;">(${e.rec1.toLocaleString()} + ${e.rec2.toLocaleString()} + ${e.rec3.toLocaleString()})</span>
                     </span>
                   </div>
                `}).join(`<span style="color: #cbd5e1; margin: 0 8px;">|</span>`)||`<span style="color: #94a3b8; font-size: 12px;">No data available</span>`}
                   </div>
                </div>
             `}}),t()},[]),(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)(`h1`,{children:`NineTable Tree Overview`}),(0,a.jsxs)(`div`,{style:{width:`90%`,display:`flex`,justifyContent:`flex-end`,gap:`8px`,marginBottom:`10px`},children:[(0,a.jsx)(`button`,{onClick:n,style:{...s,background:`#ff4d4f`},children:`English`}),(0,a.jsx)(`button`,{onClick:o,style:{...s,background:`#1890ff`},children:`Korean`})]}),(0,a.jsx)(`nine-table`,{ref:e,"show-footer":`true`,theme:localStorage.getItem(`nine_table_theme_dark`)===`true`?`dark`:void 0,style:{width:`90%`,height:`80vh`},children:(0,a.jsxs)(`table`,{"row-indicator":`false`,children:[(0,a.jsxs)(`colgroup`,{children:[(0,a.jsx)(`col`,{width:`50`,background:`red`,fixed:`left`}),(0,a.jsx)(`col`,{width:`50`,background:`red`}),(0,a.jsx)(`col`,{width:`180`,background:`red`}),(0,a.jsx)(`col`,{width:`80`}),(0,a.jsx)(`col`,{width:`130`}),(0,a.jsx)(`col`,{width:`100`}),(0,a.jsx)(`col`,{width:`100`}),(0,a.jsx)(`col`,{width:`100`}),(0,a.jsx)(`col`,{width:`100`}),(0,a.jsx)(`col`,{width:`100`}),(0,a.jsx)(`col`,{width:`110`}),(0,a.jsx)(`col`,{width:`110`}),(0,a.jsx)(`col`,{width:`100`})]}),(0,a.jsxs)(`thead`,{children:[(0,a.jsxs)(`tr`,{style:{height:`32px`},children:[(0,a.jsx)(`th`,{rowSpan:`2`,"cell-type":`checkbox`}),(0,a.jsxs)(`th`,{rowSpan:`2`,html:`true`,children:[`Single`,(0,a.jsx)(`br`,{}),`Select`]}),(0,a.jsx)(`th`,{rowSpan:`2`,"cell-type":`tree`,filtering:`true`,children:`TREE NAME`}),(0,a.jsx)(`th`,{rowSpan:`2`,children:`AGE`}),(0,a.jsx)(`th`,{colSpan:`3`,"data-expr":`provider.getMessage('Renderer')`,children:`Renderer`}),(0,a.jsx)(`th`,{colSpan:`3`,children:`Radio Button`}),(0,a.jsx)(`th`,{colSpan:`2`,children:`CheckBox`}),(0,a.jsx)(`th`,{children:`input`}),(0,a.jsx)(`th`,{children:`input color`}),(0,a.jsx)(`th`,{rowSpan:`2`,children:`custom chart`})]}),(0,a.jsxs)(`tr`,{style:{height:`32px`},children:[(0,a.jsx)(`th`,{children:`1`}),(0,a.jsx)(`th`,{filtering:`true`,children:`2`}),(0,a.jsx)(`th`,{children:`3`}),(0,a.jsx)(`th`,{children:`Planning`}),(0,a.jsx)(`th`,{children:`Development`}),(0,a.jsx)(`th`,{children:`Design`}),(0,a.jsx)(`th`,{children:`1`}),(0,a.jsx)(`th`,{children:`2`}),(0,a.jsx)(`th`,{colSpan:`2`,children:`input date`})]})]}),(0,a.jsxs)(`tbody`,{children:[(0,a.jsxs)(`tr`,{style:{height:`42px`},children:[(0,a.jsx)(`td`,{"data-bind":`sel`,rowSpan:`2`,"cell-type":`checkbox`}),(0,a.jsx)(`td`,{"data-bind":`sel2`,rowSpan:`2`,"cell-type":`checkbox`,"is-radio":`true`}),(0,a.jsx)(`td`,{"data-bind":`NAME`,rowSpan:`2`,"cell-type":`tree`,"key-name":`nodeId`,"parent-key-name":`parentId`,html:`true`}),(0,a.jsx)(`td`,{"data-bind":`nodeId`,rowSpan:`2`,"text-align":`center`}),(0,a.jsx)(`td`,{"data-bind":`parentId`}),(0,a.jsx)(`td`,{colSpan:`3`,"cell-type":`radio`,"data-bind":`DEPART`,"data-source":`provider.getCommonCode('DEPART')`,"key-name":`code`,"value-name":`codename`}),(0,a.jsx)(`td`,{"data-bind":`DEPART`}),(0,a.jsx)(`td`,{"cell-type":`checkbox`,"data-bind":`SEX`,"true-value":`M`,"false-value":`F`,"true-text":`Male`,"false-text":`Female`}),(0,a.jsx)(`td`,{"data-bind":`NAME`,"cell-type":`input`,enable:`data.REC1 > 30 ? true : false`}),(0,a.jsx)(`td`,{"data-bind":`COLOR2`,"cell-type":`input-color`,enable:`data.REC1 > 30 ? true : false;`}),(0,a.jsx)(`td`,{rowSpan:`2`,"data-expr":`provider.renderPieChart(data.REC1,data.REC2,data.REC3,data.REC4,data.REC5)`,html:`true`})]}),(0,a.jsxs)(`tr`,{children:[(0,a.jsx)(`td`,{"data-expr":`provider.renderBadge(data.REC1,data.REC2,data.REC3)`,html:`true`}),(0,a.jsx)(`td`,{colSpan:`3`,"data-expr":`provider.renderBarChart(data.REC1,data.REC2,data.REC3,data.REC4,data.REC5,data.REC6,data.REC7,data.REC8,data.REC9,data.REC10,data.REC11,data.REC12)`,html:`true`}),(0,a.jsx)(`td`,{"data-expr":`provider.renderBadge2(data.REC2, 'red')`,html:`true`}),(0,a.jsx)(`td`,{"data-expr":`provider.renderBadge2(data.REC3, 'olive')`,html:`true`}),(0,a.jsx)(`td`,{colSpan:`2`,"data-bind":`id1`,"cell-type":`input-date`,"date-type":`datetime-local`})]})]})]})})]})},s={padding:`6px 14px`,color:`white`,cursor:`pointer`,borderRadius:`4px`,border:`1px solid #d9d9d9`,background:`green`,fontWeight:`500`,fontSize:`13px`};export{o as default};