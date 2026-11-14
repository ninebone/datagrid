import { useEffect, useRef } from 'react';
import { exampleData } from '@/_data/example-data.js';
import "@ninebone/datagrid";

const Overview = () => {
	const DATA_CNT = 100000;
	const tableRef = useRef(null);

	const selectList = (params = {}) => {
		tableRef.current.loading = true;
		setTimeout(() => {
			tableRef.current.data.set(exampleData.generateRandomData(DATA_CNT));
		})
	};

	useEffect(() => {

		tableRef.current?.provider.add({
			getCommonCode: (group) => exampleData.generateCommonCode(group),
			getDepartName: (code) => {
				const codes = exampleData.generateCommonCode("DEPART");
				const found = codes.find(item => item.code === code);
				return found ? found.codename : '<span style="color: #94a3b8;">Unassigned</span>';
			},
			avg: (colnm) => {
				const values = tableRef.current.sheet().view.getArray()?.extract(colnm) || [];
				if (values.length === 0) return "0";

				const total = values.reduce((acc, cur) => acc + cur, 0);
				return Math.round(total / values.length).toLocaleString();
			},
			sum: (colnm) => {
				const values = tableRef.current.sheet().view.getArray()?.extract(colnm) || [];
				if (values.length === 0) return "0";

				const total = values.reduce((acc, cur) => acc + cur, 0);
				return total.toLocaleString();
			},
			summary: () => {
				const data = tableRef.current.data.getArray();
				const fields = tableRef.current.fields.get();

				const departIdx = fields.indexOf("DEPART");
				const rec1Idx = fields.indexOf("AMT1");
				const rec2Idx = fields.indexOf("AMT2");
				const rec3Idx = fields.indexOf("AMT3");

				if (departIdx === -1) return `<div style="padding: 8px; font-size: 13px; color: #64748b;">DEPART field not found.</div>`;

				// 1. 공통 코드 목록 및 매핑 맵 생성
				const departCodes = exampleData.generateCommonCode("DEPART");
				const departNameMap = departCodes.reduce((acc, item) => {
					acc[item.code] = item.codename;
					return acc;
				}, {});

				const codeOrderMap = departCodes.reduce((acc, item, index) => {
					acc[item.code] = index;
					return acc;
				}, {});

				// 2. 부서별 데이터 그룹화 및 합계 집계
				const departmentSummary = {};
				const colors = ['#0284c7', '#059669', '#d97706', '#7c3aed', '#db2777', '#2563eb'];

				data.forEach(r => {
					if (!r.v) return;
					const rawDepart = r.v[departIdx] || "Unassigned";
					const departName = departNameMap[rawDepart] || rawDepart;

					if (!departmentSummary[rawDepart]) {
						departmentSummary[rawDepart] = {
							code: rawDepart,
							name: departName,
							count: 0,
							rec1: 0,
							rec2: 0,
							rec3: 0
						};
					}

					const stats = departmentSummary[rawDepart];
					stats.count += 1;
					stats.rec1 += Number(r.v[rec1Idx]) || 0;
					stats.rec2 += Number(r.v[rec2Idx]) || 0;
					stats.rec3 += Number(r.v[rec3Idx]) || 0;
				});

				// 3. 코드 순서대로 정렬
				const sortedSummary = Object.values(departmentSummary).sort((a, b) => {
					const orderA = codeOrderMap[a.code] !== undefined ? codeOrderMap[a.code] : 999;
					const orderB = codeOrderMap[b.code] !== undefined ? codeOrderMap[b.code] : 999;
					return orderA - orderB; // 💡 기존 오탈자(-) 수정 완료
				});

				// 4. HTML 템플릿 생성
				const departItems = sortedSummary.map((stats, index) => {
					const totalSum = stats.rec1 + stats.rec2 + stats.rec3;
					const dotColor = colors[index % colors.length];

					return `
					  <div style="display: flex; align-items: center; gap: 6px; white-space: nowrap;">
						<span style="width: 8px; height: 8px; border-radius: 50%; background: ${dotColor}; display: inline-block;"></span>
						<span style="font-size: 12px; font-weight: 700; color: #0f172a;">${stats.name}</span>
						<span style="font-size: 10px; color: #64748b; background: #f1f5f9; padding: 1px 5px; border-radius: 8px;">${stats.count.toLocaleString()} rows</span>
						<span style="font-size: 11px; color: #334155;">
						 Total: <b style="color: ${dotColor};">${totalSum.toLocaleString()}</b> 
						 <span style="color: #94a3b8; font-size: 10px;">(${stats.rec1.toLocaleString()} + ${stats.rec2.toLocaleString()} + ${stats.rec3.toLocaleString()})</span>
						</span>
					  </div>
				   `;
				}).join('<span style="color: #cbd5e1; margin: 0 8px;">|</span>');

				return `
				  <div style="display: flex; align-items: center; overflow-x: auto; width: 100%; padding: 0px 12px; box-sizing: border-box; font-family: inherit; gap: 8px;">
				   <div style="display: flex; align-items: center; gap: 12px; overflow-x: auto; padding-bottom: 2px; width: 100%;">
					 ${departItems || '<span style="color: #94a3b8; font-size: 12px;">No data available</span>'}
				   </div>
				  </div>
				`;
			}
		});

		selectList();
	}, []);

	return (
		<>
			<h1>NineTable Overview</h1>

			<nine-table ref={tableRef} show-footer="true" style={{width: '90%', height: '80%'}}>
				<table row-indicator="true">
					<colgroup>
						<col width="100" background="red"/>
						<col width="120" background="red"/>
						<col width="8"/>
						<col width="140"/>
						<col width="140"/>
						<col width="140"/>
						<col width="8"/>
						<col width="140"/>
						<col width="140"/>
						<col width="140"/>
					</colgroup>
					<thead>
					<tr style={{height: '32px'}}>
						<th rowSpan="2" filtering="true">NAME</th>
						<th rowSpan="2" filtering="true">DEPART</th>
						<th colSpan="4">renderer</th>
						<th colSpan="4">input</th>
					</tr>
					<tr style={{height: '32px'}}>
						<th colSpan="2">AMT1</th>
						<th>AMT2</th>
						<th>AMT3</th>
						<th colSpan="2">AMT1</th>
						<th>AMT2</th>
						<th>AMT3</th>
					</tr>
					</thead>
					<tbody>
					<tr>
						<td data-bind="NAME"></td>
						<td data-bind="DEPART" data-expr="provider.getDepartName(data.DEPART)" html="true"></td>
						<td background="data.AMT1 + data.AMT2 + data.AMT3 < 100000000 ? '#ccc' : '#e5e7eb'"></td>
						<td data-bind="AMT1" text-align="right" data-expr="data.AMT1.toLocaleString()"></td>
						<td data-bind="AMT2" text-align="right" data-expr="data.AMT2.toLocaleString()"></td>
						<td data-bind="AMT3" text-align="right" data-expr="data.AMT3.toLocaleString()"></td>
						<td background="data.AMT1 + data.AMT2 + data.AMT3 < 100000000 ? '#ccc' : '#e5e7eb'"></td>
						<td data-bind="AMT1" cell-type="input" text-align="right"></td>
						<td data-bind="AMT2" cell-type="input" text-align="right"></td>
						<td data-bind="AMT3" cell-type="input" text-align="right"></td>
					</tr>
					</tbody>
					<tfoot>
					<tr>
						<td></td>
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

export default Overview;