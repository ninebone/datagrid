import{i as e,o as t,r as n}from"./index-BLzx645I.js";import{n as r}from"./nine-table-CnlVOZVS.js";var i=t(e(),1),a=n(),o=()=>{let e=(0,i.useRef)(null),t=(t={})=>{e.current.loading=!0,setTimeout(()=>{e.current.data.set(r.generateRandomData(2e3))})};return(0,i.useEffect)(()=>{e.current.provider.add?.({avg:(t,n)=>{n??=e.current.data.getArray();let r=n?.extract(t)||[];if(r.length===0)return`0`;let i=r.reduce((e,t)=>e+t,0);return Math.round(i/r.length).toLocaleString()},sum:(t,n)=>{n??=e.current.data.getArray();let r=n?.extract(t)||[];return r.length===0?`0`:r.reduce((e,t)=>e+t,0).toLocaleString()},summary:()=>{let t=e.current.data.getArray();if(!Array.isArray(t)||t.length===0)return`<div style="padding: 8px; font-size: 13px; color: #64748b;">No data available</div>`;let n=t.filter(e=>e&&(e.v||e.record?.v)).length,r=t.extract(`AMT1`).reduce((e,t)=>e+(Number(t)||0),0),i=t.extract(`AMT2`).reduce((e,t)=>e+(Number(t)||0),0),a=t.extract(`AMT3`).reduce((e,t)=>e+(Number(t)||0),0),o=r+i+a;return`
				  <div style="display: flex; align-items: center; overflow-x: auto; width: 100%; padding: 0px 12px; box-sizing: border-box; font-family: inherit; gap: 16px;">
				   <div style="display: flex; align-items: center; gap: 12px; padding-bottom: 2px; width: 100%;">
					
					<div style="display: flex; align-items: center; gap: 6px; white-space: nowrap;">
					 <span style="width: 8px; height: 8px; border-radius: 50%; background: #0284c7; display: inline-block;"></span>
					 <span style="font-size: 12px; font-weight: 700; color: #0f172a;">Total Summary</span>
					 <span style="font-size: 10px; color: #64748b; background: #f1f5f9; padding: 1px 5px; border-radius: 8px;">${n.toLocaleString()} rows</span>
					 <span style="font-size: 11px; color: #334155;">
					  Grand Total: <b style="color: #0284c7;">${o.toLocaleString()}</b> 
					  <span style="color: #94a3b8; font-size: 10px;">(${r.toLocaleString()} + ${i.toLocaleString()} + ${a.toLocaleString()})</span>
					 </span>
					</div>
			
				   </div>
				  </div>
				`},serialChart:e=>{if(!e||!Array.isArray(e)||e.length===0)return``;let t=e.extract(`AMT1`).map(e=>Number(e)||0);if(t.length===0)return``;let n=`#3b82f6`,r=Math.min(...t),i=Math.max(...t)-r||1,a=t.map((e,n)=>{let a=n/(t.length>1?t.length-1:1)*100,o=(e-r)/i*100;return{x:a,y:22-Math.min(Math.max(o,0),100)/100*18-2}}),o=`M ${a[0].x} ${a[0].y}`;for(let e=0;e<a.length-1;e++){let t=a[e],n=a[e+1],r=(t.x+n.x)/2;o+=` C ${r} ${t.y}, ${r} ${n.y}, ${n.x} ${n.y}`}return`
				  <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 24px; padding: 0 4px; box-sizing: border-box;">
					 <svg viewBox="0 0 100 22" style="width: 100%; height: 22px; display: block; overflow: visible;" preserveAspectRatio="none">
						<path d="${`${o} L 100 22 L 0 22 Z`}" fill="${n}" opacity="0.15" />
						<path d="${o}" fill="none" stroke="${n}" stroke-width="2" stroke-linecap="round" />
					 </svg>
				  </div>
			   `},miniBarChart:e=>{if(!e||!Array.isArray(e)||e.length===0)return``;let t=e.extract(`AMT1`).map(e=>Number(e)||0);if(t.length===0)return``;let n=Math.max(...t,1),r=100/t.length,i=Math.max(1,r-1);return`
				  <div style="display: flex; align-items: center; width: 100%; height: 100%; margin: 0; padding: 2px 4px; box-sizing: border-box;">
					<svg viewBox="0 0 100 18" style="width: 100%; height: 18px; display: block; overflow: visible;" preserveAspectRatio="none">
					  ${t.map((e,t)=>{let a=Math.max(2,Math.round(e/n*18));return`<rect x="${t*r}" y="${18-a}" width="${i}" height="${a}" fill="#3b82f6" rx="1" opacity="0.8"/>`}).join(``)}
					</svg>
				  </div>
			   `},monthSummary:(e,t)=>{let n=t.length;return`
				   <div style="display: flex; align-items: center; font-weight: 600;">
					  <span>Monthly Group (${e[0]||``})</span>
					  <span style="font-size: 11px; color: #64748b;">
						${n.toLocaleString()} rows
					  </span>
				   </div>
				 `},departSummary:(e,t)=>{let n=t.length,i=r.generateCommonCode(`DEPART`).find(t=>t.code===e[0]);return`
				   <div style="display: flex; align-items: center; font-weight: 600;">
					  <span>Department Group (${i?i.codename:`<span style="color: #94a3b8;">Unassigned</span>`})</span>
					  <span style="font-size: 11px; color: #64748b;">
						 ${n.toLocaleString()} rows
					  </span>
				   </div>
				`}}),t()},[]),(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)(`h1`,{children:`NineTable Cell Renderer & Expression Example`}),(0,a.jsx)(`nine-table`,{ref:e,"show-footer":`true`,theme:localStorage.getItem(`nine_table_theme_dark`)===`true`?`dark`:void 0,style:{width:`90%`,height:`80vh`},children:(0,a.jsxs)(`table`,{"row-indicator":`true`,children:[(0,a.jsxs)(`colgroup`,{children:[(0,a.jsx)(`col`,{width:`200`}),(0,a.jsx)(`col`,{width:`50`}),(0,a.jsx)(`col`,{width:`130`}),(0,a.jsx)(`col`,{width:`130`}),(0,a.jsx)(`col`,{width:`130`}),(0,a.jsx)(`col`,{width:`150`}),(0,a.jsx)(`col`,{width:`150`}),(0,a.jsx)(`col`,{width:`120`}),(0,a.jsx)(`col`,{width:`120`}),(0,a.jsx)(`col`,{width:`120`})]}),(0,a.jsxs)(`thead`,{children:[(0,a.jsxs)(`tr`,{children:[(0,a.jsx)(`th`,{rowSpan:`2`,"cell-type":`tree`,filtering:`true`,children:`NAME`}),(0,a.jsx)(`th`,{rowSpan:`2`,filtering:`true`,children:`AGE`}),(0,a.jsx)(`th`,{colSpan:`3`,children:`text-align`}),(0,a.jsx)(`th`,{colSpan:`5`,children:`data-expr (Combine / HTML / Calc)`})]}),(0,a.jsxs)(`tr`,{children:[(0,a.jsx)(`th`,{children:`left`}),(0,a.jsx)(`th`,{children:`center`}),(0,a.jsx)(`th`,{children:`right`}),(0,a.jsx)(`th`,{children:`case #1`}),(0,a.jsx)(`th`,{children:`case #2`}),(0,a.jsx)(`th`,{children:`case #3`}),(0,a.jsx)(`th`,{children:`case #4`}),(0,a.jsx)(`th`,{children:`case #5`})]})]}),(0,a.jsxs)(`tbody`,{children:[(0,a.jsxs)(`tr`,{"group-by":`M`,children:[(0,a.jsx)(`td`,{"data-bind":`M`,"cell-type":`tree`,colSpan:`2`,"data-expr":`provider.monthSummary(data.M, childrenItems)`,html:`true`}),(0,a.jsx)(`td`,{"text-align":`right`,"data-expr":`provider.sum('AMT1', childrenItems)`}),(0,a.jsx)(`td`,{"text-align":`right`,"data-expr":`provider.sum('AMT2', childrenItems)`}),(0,a.jsx)(`td`,{"text-align":`right`,"data-expr":`provider.sum('AMT3', childrenItems)`}),(0,a.jsx)(`td`,{colSpan:`5`,"data-expr":`provider.miniBarChart(childrenItems)`,html:`true`})]}),(0,a.jsxs)(`tr`,{"group-by":`DEPART`,children:[(0,a.jsx)(`td`,{"data-bind":`DEPART`,"cell-type":`tree`,colSpan:`2`,"data-expr":`provider.departSummary(data.DEPART, childrenItems)`,html:`true`}),(0,a.jsx)(`td`,{"text-align":`right`,"data-expr":`provider.sum('AMT1', childrenItems)`}),(0,a.jsx)(`td`,{"text-align":`right`,"data-expr":`provider.sum('AMT2', childrenItems)`}),(0,a.jsx)(`td`,{"text-align":`right`,"data-expr":`provider.sum('AMT3', childrenItems)`}),(0,a.jsx)(`td`,{colSpan:`5`,"data-expr":`provider.serialChart(childrenItems)`,html:`true`})]}),(0,a.jsxs)(`tr`,{style:{height:`40px`},children:[(0,a.jsx)(`td`,{"data-bind":`NAME`,"cell-type":`tree`}),(0,a.jsx)(`td`,{"data-bind":`AGE`,"data-expr":`data.M + ' [' + data.AGE + ']'`}),(0,a.jsx)(`td`,{"data-bind":`AMT1`,"text-align":`right`,"data-expr":`data.AMT1.toLocaleString()`}),(0,a.jsx)(`td`,{"data-bind":`AMT2`,"text-align":`right`,"data-expr":`data.AMT2.toLocaleString()`}),(0,a.jsx)(`td`,{"data-bind":`AMT3`,"text-align":`right`,"data-expr":`data.AMT3.toLocaleString()`}),(0,a.jsx)(`td`,{"data-expr":`data.NAME + ' (' + data.AGE + ')'`}),(0,a.jsx)(`td`,{"data-expr":`'[<b><font color=blue>' + data.AGE + '</font></b>] ' + data.NAME`,html:`true`}),(0,a.jsx)(`td`,{"data-expr":`Math.round((Number(data.REC1) + Number(data.REC2) + Number(data.REC3)) / 3)`}),(0,a.jsx)(`td`,{}),(0,a.jsx)(`td`,{})]})]}),(0,a.jsxs)(`tfoot`,{children:[(0,a.jsxs)(`tr`,{children:[(0,a.jsx)(`td`,{}),(0,a.jsx)(`td`,{"text-align":`center`,"data-expr":`<span style='color:red; font-weight:700;'>μ</span>`,style:{padding:`0`},html:`true`}),(0,a.jsx)(`td`,{"text-align":`right`,"data-expr":`provider.avg('AMT1')`}),(0,a.jsx)(`td`,{"text-align":`right`,"data-expr":`provider.avg('AMT2')`}),(0,a.jsx)(`td`,{"text-align":`right`,"data-expr":`provider.avg('AMT3')`}),(0,a.jsx)(`td`,{"text-align":`center`,"data-expr":`<span style='color:red; font-weight:700;'>Σ</span>`,style:{padding:`0`},html:`true`}),(0,a.jsx)(`td`,{"text-align":`right`,"data-expr":`provider.sum('AMT1')`}),(0,a.jsx)(`td`,{"text-align":`right`,"data-expr":`provider.sum('AMT2')`}),(0,a.jsx)(`td`,{"text-align":`right`,"data-expr":`provider.sum('AMT3')`}),(0,a.jsx)(`td`,{})]}),(0,a.jsx)(`tr`,{style:{height:`48px`},children:(0,a.jsx)(`td`,{colSpan:`10`,"data-expr":`provider.summary()`,html:`true`})})]})]})})]})};export{o as default};