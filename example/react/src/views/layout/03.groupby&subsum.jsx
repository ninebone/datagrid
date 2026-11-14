import { useEffect, useRef } from 'react';
import { exampleData } from '@/_data/example-data.js';
import "@ninebone/datagrid";

const Renderer = () => {
	const DATA_CNT = 100000;
	const tableRef = useRef(null);

	const selectList = (params = {}) => {
		tableRef.current.loading = true;
		setTimeout(() => {
			tableRef.current.data.set(exampleData.generateRandomData(DATA_CNT));
		})
	};

	useEffect(() => {
		tableRef.current.provider.add?.({
			avg: (colnm, data) => {

				if (data === null || data === undefined) {
					data = tableRef.current.data.getArray();
				}

				const values = data?.extract(colnm) || [];

				if (values.length === 0) return "0";

				const total = values.reduce((acc, cur) => acc + cur, 0);
				return Math.round(total / values.length).toLocaleString();
			},
			sum: (colnm, data) => {

				if (data === null || data === undefined) {
					data = tableRef.current.data.getArray();
				}

				const values = data?.extract(colnm) || [];
				if (values.length === 0) return "0";

				const total = values.reduce((acc, cur) => acc + cur, 0);
				return total.toLocaleString();
			},
			summary: () => {
				const data = tableRef.current.data.getArray();
				if (!Array.isArray(data) || data.length === 0) {
					return `<div style="padding: 8px; font-size: 13px; color: #64748b;">No data available</div>`;
				}

				// 🚀 extract 체이닝으로 전체 집계를 단 한 줄씩 깔끔하게 처리!
				const totalCount = data.filter(r => r && (r.v || r.record?.v)).length;
				const totalRec1 = data.extract("AMT1").reduce((a, b) => a + (Number(b) || 0), 0);
				const totalRec2 = data.extract("AMT2").reduce((a, b) => a + (Number(b) || 0), 0);
				const totalRec3 = data.extract("AMT3").reduce((a, b) => a + (Number(b) || 0), 0);
				const grandTotal = totalRec1 + totalRec2 + totalRec3;

				return `
				  <div style="display: flex; align-items: center; overflow-x: auto; width: 100%; padding: 0px 12px; box-sizing: border-box; font-family: inherit; gap: 16px;">
				   <div style="display: flex; align-items: center; gap: 12px; padding-bottom: 2px; width: 100%;">
					
					<div style="display: flex; align-items: center; gap: 6px; white-space: nowrap;">
					 <span style="width: 8px; height: 8px; border-radius: 50%; background: #0284c7; display: inline-block;"></span>
					 <span style="font-size: 12px; font-weight: 700; color: #0f172a;">Total Summary</span>
					 <span style="font-size: 10px; color: #64748b; background: #f1f5f9; padding: 1px 5px; border-radius: 8px;">${totalCount.toLocaleString()} rows</span>
					 <span style="font-size: 11px; color: #334155;">
					  Grand Total: <b style="color: #0284c7;">${grandTotal.toLocaleString()}</b> 
					  <span style="color: #94a3b8; font-size: 10px;">(${totalRec1.toLocaleString()} + ${totalRec2.toLocaleString()} + ${totalRec3.toLocaleString()})</span>
					 </span>
					</div>
			
				   </div>
				  </div>
				`;
			},
			serialChart: (data) => {
				if (!data || !Array.isArray(data) || data.length === 0) {
					return '';
				}

				// 1. extract 체이닝으로 AMT1 값 추출
				const values = data.extract("AMT1").map(v => Number(v) || 0);
				if (values.length === 0) return '';

				const color = '#3b82f6';
				const width = 100;
				const height = 22; // 높이 고정

				// 2. 실제 데이터의 min/max를 구해 0~100 스케일로 정규화 (금액 데이터 대응)
				const min = Math.min(...values);
				const max = Math.max(...values);
				const range = max - min || 1;

				const points = values.map((v, index) => {
					const x = (index / (values.length > 1 ? values.length - 1 : 1)) * width;
					const normalized = ((v - min) / range) * 100;
					const safeV = Math.min(Math.max(normalized, 0), 100);

					// 🛑 깨졌던 수식(- 연산자 복구 완료)
					const y = height - (safeV / 100) * (height - 4) - 2;
					return { x, y };
				});

				// 3. 3차 베지어 곡선(Cubic Bézier) 패스 생성
				let pathData = `M ${points[0].x} ${points[0].y}`;
				for (let i = 0; i < points.length - 1; i++) {
					const p0 = points[i];
					const p1 = points[i + 1];
					const cpX = (p0.x + p1.x) / 2;
					pathData += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
				}

				// 하단 영역 채우기용 패스
				const areaData = `${pathData} L ${width} ${height} L 0 ${height} Z`;

				return `
				  <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 24px; padding: 0 4px; box-sizing: border-box;">
					 <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 22px; display: block; overflow: visible;" preserveAspectRatio="none">
						<path d="${areaData}" fill="${color}" opacity="0.15" />
						<path d="${pathData}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" />
					 </svg>
				  </div>
			   `;
			},
			miniBarChart: (data) => {
				if (!data || !Array.isArray(data) || data.length === 0) return '';
				const values = data.extract("AMT1").map(v => Number(v) || 0);
				if (values.length === 0) return '';

				const color = '#3b82f6';
				const width = 100;
				const height = 18; // 💡 세로 좌표계를 낮춰서 컴팩트하게 조정
				const max = Math.max(...values, 1);

				const barWidth = width / values.length;
				const rectWidth = Math.max(1, barWidth - 1);

				const bars = values.map((v, index) => {
					const h = Math.max(2, Math.round((v / max) * height));
					const x = index * barWidth;
					const y = height - h;
					return `<rect x="${x}" y="${y}" width="${rectWidth}" height="${h}" fill="${color}" rx="1" opacity="0.8"/>`;
				}).join('');

				return `
				  <div style="display: flex; align-items: center; width: 100%; height: 100%; margin: 0; padding: 2px 4px; box-sizing: border-box;">
					<svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 18px; display: block; overflow: visible;" preserveAspectRatio="none">
					  ${bars}
					</svg>
				  </div>
			   `;
			},
			monthSummary: (M, data) => {
				const count = data.length;

				return `
				   <div style="display: flex; align-items: center; font-weight: 600;">
					  <span>Monthly Group (${M[0] || ''})</span>
					  <span style="font-size: 11px; color: #64748b;">
						${count.toLocaleString()} rows
					  </span>
				   </div>
				 `;
			},
			departSummary: (DEPART, data) => {
				const count = data.length;

				const codes = exampleData.generateCommonCode("DEPART");
				const found = codes.find(item => item.code === DEPART[0]);
				const departName = found ? found.codename : '<span style="color: #94a3b8;">Unassigned</span>';

				return `
				   <div style="display: flex; align-items: center; font-weight: 600;">
					  <span>Department Group (${departName})</span>
					  <span style="font-size: 11px; color: #64748b;">
						 ${count.toLocaleString()} rows
					  </span>
				   </div>
				`;
			},
		});

		selectList();
	}, []);

	return (
		<>
			<h1>NineTable Cell Renderer & Expression Example</h1>

			<nine-table ref={tableRef} show-footer="true" style={{width: '90%', height: '80%'}}>
				<table row-indicator="true">
					<colgroup>
						<col width="200"/>
						<col width="50"/>
						<col width="130"/>
						<col width="130"/>
						<col width="130"/>
						<col width="150"/>
						<col width="150"/>
						<col width="120"/>
						<col width="120"/>
						<col width="120"/>
					</colgroup>
					<thead>
					<tr>
						<th rowSpan="2" cell-type="tree" filtering="true">NAME</th>
						<th rowSpan="2" filtering="true">AGE</th>
						<th colSpan="3">text-align</th>
						<th colSpan="5">data-expr (Combine / HTML / Calc)</th>
					</tr>
					<tr>
						<th>left</th>
						<th>center</th>
						<th>right</th>
						<th>case #1</th>
						<th>case #2</th>
						<th>case #3</th>
						<th>case #4</th>
						<th>case #5</th>
					</tr>
					</thead>
					<tbody>
					<tr group-by="M">
						<td data-bind="M" cell-type="tree" colSpan="2"
							data-expr="provider.monthSummary(data.M, childrenItems)" html="true"></td>
						<td text-align="right" data-expr="provider.sum('AMT1', childrenItems)"></td>
						<td text-align="right" data-expr="provider.sum('AMT2', childrenItems)"></td>
						<td text-align="right" data-expr="provider.sum('AMT3', childrenItems)"></td>
						<td colSpan="5" data-expr="provider.miniBarChart(childrenItems)" html="true"></td>
					</tr>

					<tr group-by="DEPART">
						<td data-bind="DEPART" cell-type="tree" colSpan="2"
							data-expr="provider.departSummary(data.DEPART, childrenItems)" html="true"></td>
						<td text-align="right" data-expr="provider.sum('AMT1', childrenItems)"></td>
						<td text-align="right" data-expr="provider.sum('AMT2', childrenItems)"></td>
						<td text-align="right" data-expr="provider.sum('AMT3', childrenItems)"></td>
						<td colSpan="5" data-expr="provider.serialChart(childrenItems)" html="true"></td>
					</tr>

					<tr style={{height: '40px'}}>
						<td data-bind="NAME" cell-type="tree"></td>
						<td data-bind="AGE" data-expr="data.M + ' [' + data.AGE + ']'"></td>
						<td data-bind="AMT1" text-align="right" data-expr="data.AMT1.toLocaleString()"></td>
						<td data-bind="AMT2" text-align="right" data-expr="data.AMT2.toLocaleString()"></td>
						<td data-bind="AMT3" text-align="right" data-expr="data.AMT3.toLocaleString()"></td>
						<td data-expr="data.NAME + ' (' + data.AGE + ')'"></td>
						<td data-expr="'[<b><font color=blue>' + data.AGE + '</font></b>] ' + data.NAME"
							html="true"></td>
						<td data-expr="Math.round((Number(data.REC1) + Number(data.REC2) + Number(data.REC3)) / 3)"></td>
						<td></td>
						<td></td>
					</tr>
					</tbody>
					<tfoot>
					<tr>
						<td></td>
						<td text-align="center" data-expr="<span style='color:red; font-weight:700;'>μ</span>"
							style={{padding: '0'}} html="true"></td>
						<td text-align="right" data-expr="provider.avg('AMT1')"></td>
						<td text-align="right" data-expr="provider.avg('AMT2')"></td>
						<td text-align="right" data-expr="provider.avg('AMT3')"></td>
						<td text-align="center" data-expr="<span style='color:red; font-weight:700;'>Σ</span>"
							style={{padding: '0'}} html="true"></td>
						<td text-align="right" data-expr="provider.sum('AMT1')"></td>
						<td text-align="right" data-expr="provider.sum('AMT2')"></td>
						<td text-align="right" data-expr="provider.sum('AMT3')"></td>
						<td></td>
					</tr>
					<tr style={{height: '48px'}}>
						<td colSpan="10" data-expr="provider.summary()" html="true"></td>
					</tr>
					</tfoot>
				</table>
			</nine-table>
		</>
	);
};

export default Renderer;