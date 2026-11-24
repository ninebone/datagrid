import { useEffect, useRef } from 'react';
import { exampleData, fetchMessages } from '@/_data/example-data.js';
import "@ninebone/datagrid";

const Overview = () => {
	const DATA_CNT = 100;
	const tableRef = useRef(null);

	const selectList = (params = {}) => {
		tableRef.current.loading = true;
		setTimeout(() => {
			tableRef.current.data.set(exampleData.generateRandomTree(DATA_CNT));
		});
	};

	const handleEn = () => {
		localStorage.setItem("lang", "en");
		tableRef.current.refresh();
	};

	const handleKo = () => {
		localStorage.setItem("lang", "ko");
		tableRef.current.refresh();
	};

	useEffect(() => {

		tableRef.current?.provider.add({
			getCommonCode: (group) => exampleData.generateCommonCode(group),
			getMessage: (code) => {
				return exampleData.getMessage(localStorage.getItem("lang"), code);
			},
			renderImage: (imageUrl, ...values) => {
				const nums = values.map(v => Number(v) || 0);
				const total = nums.reduce((acc, cur) => acc + cur, 0);
				const avg = nums.length > 0 ? Math.round(total / nums.length) : 0;

				const size = 36;
				const center = size / 2;
				const radius = center - 4;
				const circumference = 2 * Math.PI * radius;

				const safeAvg = Math.min(Math.max(avg, 0), 100);
				const strokeDashoffset = circumference - (safeAvg / 100) * circumference;
				const chartColor = safeAvg > 50 ? '#10b981' : '#3b82f6';

				return `
                <div style="display: flex; justify-content:center; align-items: center; gap: 8px; width: 100%;">
                   <img src="${imageUrl}" style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" />
                   <div style="position: relative; display: flex; align-items: center; justify-content: center; width: ${size}px; height: ${size}px; flex-shrink: 0;">
                     <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg);">
                       <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="#e2e8f0" stroke-width="3" />
                       <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${chartColor}" stroke-width="3" 
                         stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" stroke-linecap="round" />
                     </svg>
                     <div style="position: absolute; font-size: 10px; font-weight: 700; color: #1e293b;">
                       ${avg}
                     </div>
                   </div>
                </div>
              `;
			},
			renderBadge: (v1, v2, v3) => {
				const v = (Number(v1) + Number(v2) + Number(v3)) / 3;
				return v > 50
					? `<span style="width: ${v}%; padding-left: 4px; display: block; background: #d1e7dd; color: #0f5132;">High</span>`
					: `<span style="width: ${v}%; padding-left: 4px; display: block; background: #f8d7da; color: #842029;">Low</span>`;
			},
			renderBadge2: (v, bg) => {
				return `
                <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
                   <span style="color: ${bg}; font-weight: 700; min-width: 16px; text-align: right;">${v}</span>
                   <div style="flex: 1; background: #e2e8f0; height: 6px; border-radius: 3px; overflow: hidden;">
                      <div style="width: ${v}%; height: 100%; background: ${bg};"></div>
                   </div>
                </div>
             `;
			},
			renderBarChart: (...values) => {
				const color = '#3b82f6';
				const width = 100;
				const height = 22;

				if (!values || values.length === 0) return '';

				const points = values.map((v, index) => {
					const x = (index / (values.length > 1 ? values.length - 1 : 1)) * width;
					const safeV = Math.min(Math.max(v, 0), 100);
					const y = height - (safeV / 100) * (height - 4) - 2;
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

				return `
                <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 24px; padding: 0 4px; box-sizing: border-box;">
                   <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 22px; display: block; overflow: visible;" preserveAspectRatio="none">
                     <path d="${areaData}" fill="${color}" opacity="0.15" />
                     <path d="${pathData}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" />
                   </svg>
                </div>
             `;
			},
			renderPieChart: (...values) => {
				const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#6366f1', '#14b8a6', '#f97316', '#a855f7'];
				const size = 56;
				const center = size / 2;
				const radius = center - 4;

				const nums = values.map(v => Math.max(Number(v) || 0, 0));
				const total = nums.reduce((acc, cur) => acc + cur, 0);

				if (total === 0) {
					return `
                   <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 56px;">
                      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
                         <circle cx="${center}" cy="${center}" r="${radius}" fill="#e2e8f0" />
                      </svg>
                   </div>
                `;
				}

				let currentAngle = 0;
				const paths = nums.map((val, index) => {
					if (val === 0) return '';
					const sliceAngle = (val / total) * 360;
					const startAngle = currentAngle;
					const endAngle = currentAngle + sliceAngle;
					currentAngle = endAngle;

					const color = colors[index % colors.length];

					if (sliceAngle >= 360) {
						return `<circle cx="${center}" cy="${center}" r="${radius}" fill="${color}" />`;
					}

					const startRad = (startAngle - 90) * (Math.PI / 180);
					const endRad = (endAngle - 90) * (Math.PI / 180);

					const x1 = center + radius * Math.cos(startRad);
					const y1 = center + radius * Math.sin(startRad);
					const x2 = center + radius * Math.cos(endRad);
					const y2 = center + radius * Math.sin(endRad);

					const largeArcFlag = sliceAngle > 180 ? 1 : 0;
					const pathData = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

					return `<path d="${pathData}" fill="${color}" />`;
				}).join('');

				return `
                <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 56px;">
                   <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
                      <circle cx="${center}" cy="${center}" r="${radius}" fill="#e2e8f0" />
                      ${paths}
                   </svg>
                </div>
             `;
			},
			summary: () => {
				const data = tableRef.current.data.getArray();
				const fields = tableRef.current.fields.get();

				const departIdx = fields.indexOf("DEPART");
				const rec1Idx = fields.indexOf("REC1");
				const rec2Idx = fields.indexOf("REC2");
				const rec3Idx = fields.indexOf("REC3");

				if (departIdx === -1) return `<div style="padding: 8px; font-size: 13px; color: #64748b;">DEPART field not found.</div>`;

				const departCodes = exampleData.generateCommonCode("DEPART");
				const departNameMap = departCodes.reduce((acc, item) => {
					acc[item.code] = item.codename;
					return acc;
				}, {});

				const codeOrderMap = departCodes.reduce((acc, item, index) => {
					acc[item.code] = index;
					return acc;
				}, {});

				const departmentSummary = {};
				const colors = ['#0284c7', '#059669', '#d97706', '#7c3aed', '#db2777', '#2563eb'];

				data.forEach(r => {
					const recordObj = r.v ? r : (r.record || {});
					const values = recordObj.v || [];
					const rawDepart = values[departIdx] || "Unassigned";
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

					departmentSummary[rawDepart].count += 1;
					departmentSummary[rawDepart].rec1 += Number(values[rec1Idx]) || 0;
					departmentSummary[rawDepart].rec2 += Number(values[rec2Idx]) || 0;
					departmentSummary[rawDepart].rec3 += Number(values[rec3Idx]) || 0;
				});

				const sortedSummary = Object.values(departmentSummary).sort((a, b) => {
					const orderA = codeOrderMap[a.code] !== undefined ? codeOrderMap[a.code] : 999;
					const orderB = codeOrderMap[b.code] !== undefined ? codeOrderMap[b.code] : 999;
					return orderA - orderB;
				});

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
			<h1>NineTable Tree Overview</h1>

			<div style={{width: '90%', display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '10px'}}>
				<button onClick={handleEn} style={{...buttonStyle, background: '#ff4d4f'}}>English</button>
				<button onClick={handleKo} style={{...buttonStyle, background: '#1890ff'}}>Korean</button>
			</div>

			<nine-table ref={tableRef} show-footer="true" theme={localStorage.getItem('nine_table_theme_dark') === 'true' ? 'dark' : undefined} style={{width: '90%', height: '80vh'}}>
				<table row-indicator="false">
					<colgroup>
						<col width="50" background="red" fixed="left"/>
						<col width="50" background="red"/>
						<col width="180" background="red"/>
						<col width="80"/>
						<col width="130"/>
						<col width="100"/>
						<col width="100"/>
						<col width="100"/>
						<col width="100"/>
						<col width="100"/>
						<col width="110"/>
						<col width="110"/>
						<col width="100"/>
					</colgroup>
					<thead>
					<tr style={{height: '32px'}}>
						<th rowSpan="2" cell-type="checkbox"></th>
						<th rowSpan="2" html="true">Single<br/>Select</th>
						<th rowSpan="2" cell-type="tree" filtering="true">TREE NAME</th>
						<th rowSpan="2">AGE</th>
						<th colSpan="3" data-expr="provider.getMessage('Renderer')">Renderer</th>
						<th colSpan="3">Radio Button</th>
						<th colSpan="2">CheckBox</th>
						<th>input</th>
						<th>input color</th>
						<th rowSpan="2">custom chart</th>
					</tr>
					<tr style={{height: '32px'}}>
						<th>1</th>
						<th filtering="true">2</th>
						<th>3</th>
						<th>Planning</th>
						<th>Development</th>
						<th>Design</th>
						<th>1</th>
						<th>2</th>
						<th colSpan="2">input date</th>
					</tr>
					</thead>
					<tbody>
					<tr style={{height: '42px'}}>
						<td data-bind="sel" rowSpan="2" cell-type="checkbox"></td>
						<td data-bind="sel2" rowSpan="2" cell-type="checkbox" is-radio="true"></td>

						<td data-bind="NAME" rowSpan="2" cell-type="tree" key-name="nodeId" parent-key-name="parentId" html="true"></td>

						<td data-bind="nodeId" rowSpan="2" text-align="center"></td>
						<td data-bind="parentId"></td>

						<td colSpan="3" cell-type="radio" data-bind="DEPART"
							data-source="provider.getCommonCode('DEPART')"
							key-name="code" value-name="codename"></td>

						<td data-bind="DEPART"></td>
						<td cell-type="checkbox" data-bind="SEX" true-value="M" false-value="F"
							true-text="Male" false-text="Female"></td>

						<td data-bind="NAME" cell-type="input" enable="data.REC1 > 30 ? true : false"></td>
						<td data-bind="COLOR2" cell-type="input-color" enable="data.REC1 > 30 ? true : false;"></td>

						<td rowSpan="2"
							data-expr="provider.renderPieChart(data.REC1,data.REC2,data.REC3,data.REC4,data.REC5)"
							html="true"></td>
					</tr>
					<tr>
						<td data-expr="provider.renderBadge(data.REC1,data.REC2,data.REC3)" html="true"></td>

						<td colSpan="3"
							data-expr="provider.renderBarChart(data.REC1,data.REC2,data.REC3,data.REC4,data.REC5,data.REC6,data.REC7,data.REC8,data.REC9,data.REC10,data.REC11,data.REC12)"
							html="true"></td>

						<td data-expr="provider.renderBadge2(data.REC2, 'red')" html="true"></td>
						<td data-expr="provider.renderBadge2(data.REC3, 'olive')" html="true"></td>

						<td colSpan="2" data-bind="id1" cell-type="input-date" date-type="datetime-local"></td>
					</tr>
					</tbody>
				</table>
			</nine-table>
		</>
	);
};

const buttonStyle = {
	padding: '6px 14px',
	color: 'white',
	cursor: 'pointer',
	borderRadius: '4px',
	border: '1px solid #d9d9d9',
	background: 'green',
	fontWeight: '500',
	fontSize: '13px'
};

export default Overview;