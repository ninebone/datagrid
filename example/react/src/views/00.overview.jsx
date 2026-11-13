import { useEffect, useRef } from 'react';
import { exampleData } from '@/_data/example-data.js';
import "@ninebone/datagrid";

const Overview = () => {
	const DATA_CNT = 10000;
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
			renderImage: (imageUrl, ...values) => {

				// 1. 가변 인자 값들의 평균 계산 (값이 없으면 0)
				const nums = values.map(v => Number(v) || 0);
				const total = nums.reduce((acc, cur) => acc + cur, 0);
				const avg = nums.length > 0 ? Math.round(total / nums.length) : 0;

				// 2. 미니 도넛 차트 설정 (지름 36px)
				const size = 36;
				const center = size / 2;
				const radius = center - 4;
				const circumference = 2 * Math.PI * radius;

				// 평균값(0~100 기준 가정, 넘치면 100으로 제한)을 백분율로 환산
				const safeAvg = Math.min(Math.max(avg, 0), 100);
				const strokeDashoffset = circumference - (safeAvg / 100) * circumference;
				const chartColor = safeAvg > 50 ? '#10b981' : '#3b82f6'; // 점수에 따른 색상 분기

				return `
					<div style="display: flex; justify-content:center; align-items: center; gap: 8px; width: 100%;">
					   <!-- 프로필 이미지 -->
					   <img src="${imageUrl}" style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" />
					   
					   <!-- 미니 도넛 차트 및 평균값 텍스트 -->
					   <div style="position: relative; display: flex; align-items: center; justify-content: center; width: ${size}px; height: ${size}px; flex-shrink: 0;">
						  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg);">
							 <!-- 백그라운드 트랙 원 -->
							 <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="#e2e8f0" stroke-width="3" />
							 <!-- 진행률 도넛 원 -->
							 <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${chartColor}" stroke-width="3" 
								stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" stroke-linecap="round" />
						  </svg>
						  <!-- 중앙에 표시되는 평균 숫자 -->
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
				const height = 22; // 높이 고정

				if (!values || values.length === 0) return '';

				const points = values.map((v, index) => {
					const x = (index / (values.length > 1 ? values.length - 1 : 1)) * width;
					const safeV = Math.min(Math.max(v, 0), 100);
					// 🛑 깨졌던 수식(- 연산자 복구)
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
				const size = 36; // 셀 높이에 맞게 살짝 컴팩트하게 조정
				const center = size / 2;
				// 🛑 깨졌던 수식(- 연산자 복구)
				const radius = center - 2;

				const nums = values.map(v => Math.max(Number(v) || 0, 0));
				const total = nums.reduce((acc, cur) => acc + cur, 0);

				if (total === 0) {
					return `
                   <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
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

					// 🛑 각도 계산식 내 마이너스(-) 복구
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
					<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; box-sizing: border-box;">
					   <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display: block;">
						  <circle cx="${center}" cy="${center}" r="${radius}" fill="#e2e8f0" />
						  ${paths}
					   </svg>
					</div>
				`;
			},
			renderPieChart: (...values) => {
				const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#6366f1', '#14b8a6', '#f97316', '#a855f7'];
				const size = 56; // 셀 높이에 알맞은 컴팩트한 사이즈
				const center = size / 2;
				const radius = center - 1;

				// 유효한 숫자로 변환 및 총합 계산
				const nums = values.map(v => Math.max(Number(v) || 0, 0));
				const total = nums.reduce((acc, cur) => acc + cur, 0);

				if (total === 0) {
					return `
						<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 24px;">
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

					// 값이 하나뿐이거나 360도 꽉 찰 때
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

					// SVG Path (중앙 -> 시작점 -> 호 -> 끝점 -> 중앙 복귀)
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

				// 1. 공통 코드 목록 및 매핑 맵 생성
				const departCodes = exampleData.generateCommonCode("DEPART"); // 예: [{code: 'D01', codename: 'Planning'}, ...]
				const departNameMap = departCodes.reduce((acc, item) => {
					acc[item.code] = item.codename;
					return acc;
				}, {});

				// 코드 순서대로 정렬하기 위한 인덱스 맵 생성 (예: { 'D01': 0, 'D02': 1, ... })
				const codeOrderMap = departCodes.reduce((acc, item, index) => {
					acc[item.code] = index;
					return acc;
				}, {});

				// 부서별 데이터 그룹화 및 합계 집계
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

					departmentSummary[rawDepart].count += 1;
					departmentSummary[rawDepart].rec1 += Number(r.v[rec1Idx]) || 0;
					departmentSummary[rawDepart].rec2 += Number(r.v[rec2Idx]) || 0;
					departmentSummary[rawDepart].rec3 += Number(r.v[rec3Idx]) || 0;
				});

				// 2. 부서 코드 순서(codeOrderMap)에 맞춰 소팅
				const sortedSummary = Object.values(departmentSummary).sort((a, b) => {
					const orderA = codeOrderMap[a.code] !== undefined ? codeOrderMap[a.code] : 999;
					const orderB = codeOrderMap[b.code] !== undefined ? codeOrderMap[b.code] : 999;
					return orderA - orderB;
				});

				// 3. 정렬된 데이터를 기반으로 HTML 항목 생성
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
						<col width="50" background="red" fixed="left"/>
						<col width="50" background="red"/>
						<col width="100" background="red"/>
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
						<th rowSpan="2">Single<br/>Select</th>
						<th colSpan="3">Renderer</th>
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
						<td data-bind="NAME" rowSpan="2"
							data-expr="provider.renderImage(data.PIC, data.REC1, data.REC2, data.REC3)"
							html="true"></td>
						<td data-bind="NAME" rowSpan="2"></td>
						<td data-expr="'<font color=\'#999\'>' + data.REC1 + '+' + data.REC2 + '+' + data.REC3 + ' (Avg.<font color=\'green\'><b>' + Math.round((data.REC1 + data.REC2 + data.REC3) / 3) + '</b></font>)</font>'"
							html="true"></td>


						<td colSpan="3" cell-type="radio" data-bind="DEPART"
							data-source="provider.getCommonCode('DEPART')"
							key-name="code" value-name="codename"></td>

						<td cell-type="checkbox" data-bind="SEX" true-value="M" false-value="F"></td>
						<td cell-type="checkbox" data-bind="SEX" text-align="right" true-value="M" false-value="F"
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

						<td colSpan="2" data-bind="BIRTH_DT" cell-type="input-date" date-type="datetime-local"></td>
					</tr>
					</tbody>
					<tfoot>
					<tr style={{height: '48px'}}>
						<td></td>
						<td colSpan="12" data-expr="provider.summary()" html="true"></td>
					</tr>
					</tfoot>
				</table>
				<table row-indicator="true">
					<colgroup>
						<col width="100" background="red"/>
						<col width="50"/>
						<col width="50"/>
						<col width="50"/>
						<col width="50"/>
						<col width="50"/>
						<col width="50"/>
						<col width="50"/>
						<col width="50"/>
						<col width="50"/>
						<col width="50"/>
						<col width="50"/>
						<col width="50"/>
					</colgroup>
					<thead>
					<tr>
						<th filtering="true">NAME</th>
						<th filtering="true">AGE</th>
						<th filtering="true">REC1</th>
						<th filtering="true">REC2</th>
						<th filtering="true">REC3</th>
						<th filtering="true">REC4</th>
						<th filtering="true">REC5</th>
						<th filtering="true">REC6</th>
						<th filtering="true">REC7</th>
						<th filtering="true">REC8</th>
						<th filtering="true">REC9</th>
						<th filtering="true">REC10</th>
						<th filtering="true">REC11</th>
					</tr>
					</thead>
					<tbody>
					<tr>
						<td data-bind="NAME"></td>
						<td data-bind="AGE" text-align="center"></td>
						<td data-bind="REC1" text-align="center"></td>
						<td data-bind="REC2" text-align="center"></td>
						<td data-bind="REC3" text-align="center"></td>
						<td data-bind="REC4" text-align="center"></td>
						<td data-bind="REC5" text-align="center"></td>
						<td data-bind="REC6" text-align="center"></td>
						<td data-bind="REC7" text-align="center"></td>
						<td data-bind="REC8" text-align="center"></td>
						<td data-bind="REC9" text-align="center"></td>
						<td data-bind="REC10" text-align="center"></td>
						<td data-bind="REC11" text-align="center"></td>
					</tr>
					</tbody>
				</table>
			</nine-table>
		</>
	);
};

export default Overview;