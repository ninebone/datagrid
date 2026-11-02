import { useScreen, useState, useEffect, useRef } from 'react';

import { exampleData } from '../_data/example-data.js';

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
		tableRef.current.renderBadge = (val) => {
			if (val > 50) {
				return `<span style="display: block; box-sizing: border-box; padding: 0 6px; background: #d1e7dd; color: #0f5132; border-radius: 4px;">High</span>`;
			} else {
				return `<span style="display: block; box-sizing: border-box; padding: 0 6px; background: #f8d7da; color: #842029; border-radius: 4px;">Low</span>`;
			}
		};

		tableRef.current.formatDecimalNumber = (num, decimals = 2) => {
			if (isNaN(num)) return 0;
			const factor = Math.pow(10, decimals);
			return Math.round(num * factor) / factor;
		}

		selectList();
	}, []);

	return (
		<>
			<h1>NineTable Cell Renderer & Expression Example</h1>

			<nine-table ref={tableRef} show-footer="true" style={{width: '90%', height: '80%'}}>
				<table row-indicator="true">
					<colgroup>
						<col width="100"/>
						<col width="50"/>
						<col width="50"/>
						<col width="50"/>
						<col width="50"/>
						<col width="150"/>
						<col width="150"/>
						<col width="120"/>
						<col width="120"/>
						<col width="120"/>
						<col width="80"/>
						<col width="80"/>
						<col width="80"/>
					</colgroup>
					<thead>
					<tr>
						<th rowSpan="2">NAME</th>
						<th rowSpan="2">AGE</th>
						<th colSpan="3">text-align</th>
						<th colSpan="5">data-expr</th>
						<th colSpan="2">color</th>
						<th rowSpan="2">visible</th>
					</tr>
					<tr>
						<th>left</th>
						<th>center</th>
						<th>right</th>
						<th>case #1 (combine)</th>
						<th>case #2 (html)</th>
						<th>case #3 (calculate)</th>
						<th>case #4 (with host)</th>
						<th>case #5 (html + host)</th>
						<th>color</th>
						<th>background</th>
					</tr>
					</thead>
					<tbody>
					<tr>
						<td data-bind="NAME"></td>
						<td data-bind="AGE"></td>
						<td data-bind="REC1" text-align="left"></td>
						<td data-bind="REC2" text-align="center"></td>
						<td data-bind="REC3" text-align="right"></td>
						<td data-expr="data.NAME + ' (' + data.AGE + ')'"></td>
						<td data-expr="'[<b><font color=blue>' + data.AGE + '</font></b>] ' + data.NAME" html="true"></td>
						<td data-expr="Math.round((data.REC1 + data.REC2 + data.REC3) / 3)"></td>
						<td data-expr="host.formatDecimalNumber((data.REC1 + data.REC2 + data.REC3) / 3, 2)"></td>
						<td data-expr="host.renderBadge(data.REC1)" html="true"></td>
						<td data-bind="REC1" color="data.REC1 < 50 ? 'red' : ''"></td>
						<td data-bind="REC1" background-color="data.REC1 < 50 ? 'rgba(255,0,0,0.5)' : ''"></td>
						<td data-bind="REC1" visible="data.REC1 < 50 ? true : false"></td>
					</tr>
					</tbody>
				</table>
			</nine-table>
		</>
	);
};

export default Renderer;