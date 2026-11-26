import { useEffect, useRef } from 'react';
import { exampleData } from '@/_data/example-data.js';
import { exampleProvider } from "@/_data/example-provider.js";
import { NINE_TABLE } from "@ninebone/datagrid";

const Combo = () => {
	const DATA_CNT = 100000;
	const tableRef = useRef(null);

	const selectList = (params = {}) => {
		tableRef.current.loading = true;
		setTimeout(() => {
			tableRef.current.data.set(exampleData.generateRandomData2(DATA_CNT));
		})
	};

	const selectCode = async () => {
		setTimeout( () => {
			tableRef.current.getCommonCode = (group) => {
				return exampleData.generateCommonCode(group);
			};
		});
	};

	useEffect(() => {
		/**
- Fields defined in the table markup are registered automatically.
- Add extra fields here that aren't in the design but are needed by custom providers.
- */
		tableRef.current.addEventListener(NINE_TABLE.EVENT.LOAD, (e) => {
			tableRef.current.fields.add(["PIC", "EMAIL", "STATUS", "DEPART"]);
		}, { once: true });

		const getMonthCodes = (row) => {
			if (!row) return [];
			const values = [];
			for (let i = 1; i <= 31; i++) {
				const v = row[`D${i}`];
				if (v) values.push(v);
			}
			return values;
		};

		tableRef.current.provider.add?.({
			...exampleProvider,
			style: `
                small { position: absolute; top: 0; left: 4px; color: #999; font-size: 9px; text-align: right; }
                .day-header .dow { font-size: 0.72em; color: #888; font-weight: 400; margin-left: 2px; }
                .day-sun { color: #e05252; }
                .day-sun .dow { color: #e05252; opacity: 0.85; }
                .day-sat { color: #3b82f6; }
                .day-sat .dow { color: #3b82f6; opacity: 0.85; }
                .shift-label { display: inline-block; }
                .shift-first { font-weight: 700; font-size: 9px; }
                .shift-rest { opacity: 0.58; font-weight: 400; font-size: 8px; }
            `,
			countShift: (row, targetCode) => {
				return getMonthCodes(row).filter((c) => c === targetCode).length;
			},
			countRest: (row) => {
				const restCodes = new Set(['O', 'V']);
				return getMonthCodes(row).filter((c) => restCodes.has(c)).length;
			},
			countWork: (row) => {
				const workCodes = new Set(['D', 'E', 'N', 'S']);
				return getMonthCodes(row).filter((c) => workCodes.has(c)).length;
			},
			bgShift: (code) => {
				if (!code) return '';

				const map = {
					N: 'rgba(30, 41, 59, 0.24)',   // Night: 가장 강한 강도 -> 가장 진한 회색 배경
					E: 'rgba(51, 65, 85, 0.20)',   // Evening
					D: 'rgba(71, 85, 105, 0.16)',  // Day
					S: 'rgba(100, 116, 139, 0.14)',// Standby
					V: 'rgba(148, 163, 184, 0.11)',// Vacation
					O: 'rgba(203, 213, 225, 0.08)',// Off: 휴무 -> 가장 연한 회색 배경
				};

				return map[code] ?? 'rgba(148, 163, 184, 0.10)';
			},
			renderShift: (code) => {
				if (!code) return '';

				const colorMap = {
					D: '#3b82f6',
					E: '#f59e0b',
					N: '#6366f1',
					O: '#94a3b8',
					V: '#10b981',
					S: '#f97316',
				};

				const codes = tableRef.current?.getCommonCode?.('SHIFT') ?? exampleData.generateCommonCode('SHIFT') ?? [];
				const matched = codes.find((item) => item.code === code);
				const text = String(matched?.codename ?? code);

				const first = text.slice(0, 1);
				const rest = text.slice(1);
				const color = colorMap[code] ?? 'inherit';

				return `<span class="shift-label" style="color: ${color};"><strong class="shift-first">${first}</strong><span class="shift-rest">${rest}</span></span>`;
			},
			sumMonthShift: (targetCode) => {
				const data = tableRef.current.data.getArray();

				const v = Array.from({ length: 31 }, (_, i) =>
					(data.extract(`D${i + 1}`) ?? []).filter((v) => v === targetCode).length)
	.				reduce((sum, cnt) => sum + cnt, 0);

				return v.toLocaleString();
			},
			sumMonthRest: () => {
				const data = tableRef.current.data.getArray();
				const restCodes = new Set(['O', 'V']);

				const v = Array.from({ length: 31 }, (_, i) =>
					(data.extract(`D${i + 1}`) ?? []).filter((code) => restCodes.has(code)).length)
					.reduce((sum, cnt) => sum + cnt, 0);

				return v.toLocaleString();
			},
			sumMonthWork: () => {
				const data = tableRef.current.data.getArray();
				const workCodes = new Set(['D', 'E', 'N', 'S']);

				const v = Array.from({ length: 31 }, (_, i) =>
					(data.extract(`D${i + 1}`) ?? []).filter((code) => workCodes.has(code)).length)
					.reduce((sum, cnt) => sum + cnt, 0);

				return v.toLocaleString();
			},
		});

		selectCode();
		selectList();
	}, []);

	return (
		<>
			<h1>NineTable High-Performance Editable Grid & Cell Validation Showcase</h1>

			<nine-table ref={tableRef} show-footer="true"
						theme={localStorage.getItem('nine_table_theme_dark') === 'true' ? 'dark' : undefined}
						style={{width: '90%', height: '80vh'}}>
				<table row-indicator="true" edit-trigger="click" caption="Monthly">
					<colgroup>
						<col width="200" fixed="left"/>
						<col width="60"/>
						<col width="60"/>
						<col width="60"/>
						<col width="60"/>
						<col width="60"/>
						<col width="60"/>
						<col width="100"/>
						<col width="100"/>
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
						<th rowSpan="2">Profile</th>
						<th colSpan="8">Monthly Summary</th>
						<th colSpan="7">Week 1</th>
						<th colSpan="7">Week 2</th>
						<th colSpan="7">Week 3</th>
						<th colSpan="7">Week 4</th>
						<th colSpan="3">Days 29-31</th>
					</tr>
					<tr>
						<th style={{color: '#3b82f6'}}>D</th>
						<th style={{color: '#f59e0b'}}>E</th>
						<th style={{color: '#6366f1'}}>N</th>
						<th style={{color: '#94a3b8'}}>O</th>
						<th style={{color: '#10b981'}}>V</th>
						<th style={{color: '#f97316'}}>S</th>
						<th>Rest</th>
						<th>Work</th>
						<th className="day-header day-sun" data-expr="1 <small>Sun</small>" html="true"></th>
						<th className="day-header" data-expr="2 <small>Mon</small>" html="true"></th>
						<th className="day-header" data-expr="3 <small>Tue</small>" html="true"></th>
						<th className="day-header" data-expr="4 <small>Wed</small>" html="true"></th>
						<th className="day-header" data-expr="5 <small>Thu</small>" html="true"></th>
						<th className="day-header" data-expr="6 <small>Fri</small>" html="true"></th>
						<th className="day-header day-sat" data-expr="7 <small>Sat</small>" html="true"></th>
						<th className="day-header day-sun" data-expr="8 <small>Sun</small>" html="true"></th>
						<th className="day-header" data-expr="9 <small>Mon</small>" html="true"></th>
						<th className="day-header" data-expr="10 <small>Tue</small>" html="true"></th>
						<th className="day-header" data-expr="11 <small>Wed</small>" html="true"></th>
						<th className="day-header" data-expr="12 <small>Thu</small>" html="true"></th>
						<th className="day-header" data-expr="13 <small>Fri</small>" html="true"></th>
						<th className="day-header day-sat" data-expr="14 <small>Sat</small>" html="true"></th>
						<th className="day-header day-sun" data-expr="15 <small>Sun</small>" html="true"></th>
						<th className="day-header" data-expr="16 <small>Mon</small>" html="true"></th>
						<th className="day-header" data-expr="17 <small>Tue</small>" html="true"></th>
						<th className="day-header" data-expr="18 <small>Wed</small>" html="true"></th>
						<th className="day-header" data-expr="19 <small>Thu</small>" html="true"></th>
						<th className="day-header" data-expr="20 <small>Fri</small>" html="true"></th>
						<th className="day-header day-sat" data-expr="21 <small>Sat</small>" html="true"></th>
						<th className="day-header day-sun" data-expr="22 <small>Sun</small>" html="true"></th>
						<th className="day-header" data-expr="23 <small>Mon</small>" html="true"></th>
						<th className="day-header" data-expr="24 <small>Tue</small>" html="true"></th>
						<th className="day-header" data-expr="25 <small>Wed</small>" html="true"></th>
						<th className="day-header" data-expr="26 <small>Thu</small>" html="true"></th>
						<th className="day-header" data-expr="27 <small>Fri</small>" html="true"></th>
						<th className="day-header day-sat" data-expr="28 <small>Sat</small>" html="true"></th>
						<th className="day-header day-sun" data-expr="29 <small>Sun</small>" html="true"></th>
						<th className="day-header" data-expr="30 <small>Mon</small>" html="true"></th>
						<th className="day-header" data-expr="31 <small>Tue</small>" html="true"></th>
					</tr>
					</thead>
					<tbody>
					<tr>
						<td data-bind="NAME" data-expr="provider.renderProfileCard(data)" html="true"></td>

						<td data-expr="provider.countShift(data, 'D')" text-align="center"></td>
						<td data-expr="provider.countShift(data, 'E')" text-align="center"></td>
						<td data-expr="provider.countShift(data, 'N')" text-align="center"></td>
						<td data-expr="provider.countShift(data, 'O')" text-align="center"></td>
						<td data-expr="provider.countShift(data, 'V')" text-align="center"></td>
						<td data-expr="provider.countShift(data, 'S')" text-align="center"></td>
						<td data-expr="provider.renderBar(provider.countRest(data), '#999', 31, true)"
							html="true"></td>
						<td data-expr="provider.renderBar(provider.countWork(data), '#666', 31)"
							html="true"></td>

						<td cell-type="combo" data-bind="D1" data-expr="provider.renderShift(data.D1)"
							background="provider.bgShift(data.D1)" html="true"
							data-source="provider.getCommonCode('SHIFT')" key-name="code" value-name="codename"></td>
						<td cell-type="combo" data-bind="D2" data-expr="provider.renderShift(data.D2)"
							background="provider.bgShift(data.D2)" html="true"
							data-source="provider.getCommonCode('SHIFT')" key-name="code" value-name="codename"></td>
						<td cell-type="combo" data-bind="D3" data-expr="provider.renderShift(data.D3)"
							background="provider.bgShift(data.D3)" html="true"
							data-source="provider.getCommonCode('SHIFT')" key-name="code" value-name="codename"></td>
						<td cell-type="combo" data-bind="D4" data-expr="provider.renderShift(data.D4)"
							background="provider.bgShift(data.D4)" html="true"
							data-source="provider.getCommonCode('SHIFT')" key-name="code" value-name="codename"></td>
						<td cell-type="combo" data-bind="D5" data-expr="provider.renderShift(data.D5)"
							background="provider.bgShift(data.D5)" html="true"
							data-source="provider.getCommonCode('SHIFT')" key-name="code" value-name="codename"></td>
						<td cell-type="combo" data-bind="D6" data-expr="provider.renderShift(data.D6)"
							background="provider.bgShift(data.D6)" html="true"
							data-source="provider.getCommonCode('SHIFT')" key-name="code" value-name="codename"></td>
						<td cell-type="combo" data-bind="D7" data-expr="provider.renderShift(data.D7)"
							background="provider.bgShift(data.D7)" html="true"
							data-source="provider.getCommonCode('SHIFT')" key-name="code" value-name="codename"></td>
						<td cell-type="combo" data-bind="D8" data-expr="provider.renderShift(data.D8)"
							background="provider.bgShift(data.D8)" html="true"
							data-source="provider.getCommonCode('SHIFT')" key-name="code" value-name="codename"></td>
						<td cell-type="combo" data-bind="D9" data-expr="provider.renderShift(data.D9)"
							background="provider.bgShift(data.D9)" html="true"
							data-source="provider.getCommonCode('SHIFT')" key-name="code" value-name="codename"></td>
						<td cell-type="combo" data-bind="D10" data-expr="provider.renderShift(data.D10)"
							background="provider.bgShift(data.D10)" html="true"
							data-source="provider.getCommonCode('SHIFT')" key-name="code" value-name="codename"></td>
						<td cell-type="combo" data-bind="D11" data-expr="provider.renderShift(data.D11)"
							background="provider.bgShift(data.D11)" html="true"
							data-source="provider.getCommonCode('SHIFT')" key-name="code" value-name="codename"></td>
						<td cell-type="combo" data-bind="D12" data-expr="provider.renderShift(data.D12)"
							background="provider.bgShift(data.D12)" html="true"
							data-source="provider.getCommonCode('SHIFT')" key-name="code" value-name="codename"></td>
						<td cell-type="combo" data-bind="D13" data-expr="provider.renderShift(data.D13)"
							background="provider.bgShift(data.D13)" html="true"
							data-source="provider.getCommonCode('SHIFT')" key-name="code" value-name="codename"></td>
						<td cell-type="combo" data-bind="D14" data-expr="provider.renderShift(data.D14)"
							background="provider.bgShift(data.D14)" html="true"
							data-source="provider.getCommonCode('SHIFT')" key-name="code" value-name="codename"></td>
						<td cell-type="combo" data-bind="D15" data-expr="provider.renderShift(data.D15)"
							background="provider.bgShift(data.D15)" html="true"
							data-source="provider.getCommonCode('SHIFT')" key-name="code" value-name="codename"></td>
						<td cell-type="combo" data-bind="D16" data-expr="provider.renderShift(data.D16)"
							background="provider.bgShift(data.D16)" html="true"
							data-source="provider.getCommonCode('SHIFT')" key-name="code" value-name="codename"></td>
						<td cell-type="combo" data-bind="D17" data-expr="provider.renderShift(data.D17)"
							background="provider.bgShift(data.D17)" html="true"
							data-source="provider.getCommonCode('SHIFT')" key-name="code" value-name="codename"></td>
						<td cell-type="combo" data-bind="D18" data-expr="provider.renderShift(data.D18)"
							background="provider.bgShift(data.D18)" html="true"
							data-source="provider.getCommonCode('SHIFT')" key-name="code" value-name="codename"></td>
						<td cell-type="combo" data-bind="D19" data-expr="provider.renderShift(data.D19)"
							background="provider.bgShift(data.D19)" html="true"
							data-source="provider.getCommonCode('SHIFT')" key-name="code" value-name="codename"></td>
						<td cell-type="combo" data-bind="D20" data-expr="provider.renderShift(data.D20)"
							background="provider.bgShift(data.D20)" html="true"
							data-source="provider.getCommonCode('SHIFT')" key-name="code" value-name="codename"></td>
						<td cell-type="combo" data-bind="D21" data-expr="provider.renderShift(data.D21)"
							background="provider.bgShift(data.D21)" html="true"
							data-source="provider.getCommonCode('SHIFT')" key-name="code" value-name="codename"></td>
						<td cell-type="combo" data-bind="D22" data-expr="provider.renderShift(data.D22)"
							background="provider.bgShift(data.D22)" html="true"
							data-source="provider.getCommonCode('SHIFT')" key-name="code" value-name="codename"></td>
						<td cell-type="combo" data-bind="D23" data-expr="provider.renderShift(data.D23)"
							background="provider.bgShift(data.D23)" html="true"
							data-source="provider.getCommonCode('SHIFT')" key-name="code" value-name="codename"></td>
						<td cell-type="combo" data-bind="D24" data-expr="provider.renderShift(data.D24)"
							background="provider.bgShift(data.D24)" html="true"
							data-source="provider.getCommonCode('SHIFT')" key-name="code" value-name="codename"></td>
						<td cell-type="combo" data-bind="D25" data-expr="provider.renderShift(data.D25)"
							background="provider.bgShift(data.D25)" html="true"
							data-source="provider.getCommonCode('SHIFT')" key-name="code" value-name="codename"></td>
						<td cell-type="combo" data-bind="D26" data-expr="provider.renderShift(data.D26)"
							background="provider.bgShift(data.D26)" html="true"
							data-source="provider.getCommonCode('SHIFT')" key-name="code" value-name="codename"></td>
						<td cell-type="combo" data-bind="D27" data-expr="provider.renderShift(data.D27)"
							background="provider.bgShift(data.D27)" html="true"
							data-source="provider.getCommonCode('SHIFT')" key-name="code" value-name="codename"></td>
						<td cell-type="combo" data-bind="D28" data-expr="provider.renderShift(data.D28)"
							background="provider.bgShift(data.D28)" html="true"
							data-source="provider.getCommonCode('SHIFT')" key-name="code" value-name="codename"></td>
						<td cell-type="combo" data-bind="D29" data-expr="provider.renderShift(data.D29)"
							background="provider.bgShift(data.D29)" html="true"
							data-source="provider.getCommonCode('SHIFT')" key-name="code" value-name="codename"></td>
						<td cell-type="combo" data-bind="D30" data-expr="provider.renderShift(data.D30)"
							background="provider.bgShift(data.D30)" html="true"
							data-source="provider.getCommonCode('SHIFT')" key-name="code" value-name="codename"></td>
						<td cell-type="combo" data-bind="D31" data-expr="provider.renderShift(data.D31)"
							background="provider.bgShift(data.D31)" html="true"
							data-source="provider.getCommonCode('SHIFT')" key-name="code" value-name="codename"></td>
					</tr>
					</tbody>
					<tfoot>
					<tr>
						<td>Sum</td>
						<td data-expr="provider.sumMonthShift('D')" text-align="center"></td>
						<td data-expr="provider.sumMonthShift('E')" text-align="center"></td>
						<td data-expr="provider.sumMonthShift('N')" text-align="center"></td>
						<td data-expr="provider.sumMonthShift('O')" text-align="center"></td>
						<td data-expr="provider.sumMonthShift('V')" text-align="center"></td>
						<td data-expr="provider.sumMonthShift('S')" text-align="center"></td>
						<td data-expr="provider.sumMonthRest()" text-align="center"></td>
						<td data-expr="provider.sumMonthWork()" text-align="center"></td>
						<td></td>
						<td></td>
						<td></td>
						<td></td>
						<td></td>
						<td></td>
						<td></td>
						<td></td>
						<td></td>
						<td></td>
						<td></td>
						<td></td>
						<td></td>
						<td></td>
						<td></td>
						<td></td>
						<td></td>
						<td></td>
						<td></td>
						<td></td>
						<td></td>
						<td></td>
						<td></td>
						<td></td>
						<td></td>
						<td></td>
						<td></td>
						<td></td>
						<td></td>
						<td></td>
						<td></td>
					</tr>
					</tfoot>
				</table>
			</nine-table>
		</>
	);
};

export default Combo;