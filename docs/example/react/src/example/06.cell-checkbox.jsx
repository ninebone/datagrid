import { useScreen, useState, useEffect, useRef } from 'react';
import { nine, trace } from '@ninebone/util'
import { NINE_TABLE } from '@ninebone/table'
// 상대 경로 대신 별칭 사용
import { exampleData } from '../_data/example-data.js';

const CheckBox = () => {
	const DATA_CNT = 100000;
	const tableRef = useRef(null);

	const selectList = (params = {}) => {
		tableRef.current.loading = true;
		setTimeout(() => {
			tableRef.current.data.set(exampleData.generateRandomData(DATA_CNT));
		})
	};

	useEffect(() => {
		selectList();
	}, []);

	return (
		<>
			<h1>NineTable High-Performance Editable Grid & Cell Validation Showcase</h1>

			<nine-table ref={tableRef} show-footer="true" style={{width: '90%', height: '80%'}}>
				<table row-indicator="true">
					<colgroup>
						<col width="80"/>
						<col width="60"/>
						<col width="60"/>
						<col width="60"/>
						<col width="60"/>
						<col width="60"/>
						<col width="60"/>
						<col width="60"/>
						<col width="100"/>
						<col width="100"/>
						<col width="60"/>
					</colgroup>
					<thead>
					<tr>
						<th rowSpan="2">NAME</th>
						<th colSpan="4">select</th>
						<th colSpan="3">text-align</th>
						<th colSpan="2">value & text</th>
						<th rowSpan="2">is-radio</th>
					</tr>
					<tr>
						<th>normal</th>
						<th cell-type="checkbox">All</th>
						<th cell-type="checkbox">enable</th>
						<th cell-type="checkbox">visible</th>
						<th>left</th>
						<th>center</th>
						<th>right</th>
						<th>true/false-value</th>
						<th>true/false-text</th>
					</tr>
					</thead>
					<tbody>
					<tr>
						<td data-bind="NAME"></td>
						<td cell-type="checkbox" data-bind="sel1"></td>
						<td cell-type="checkbox" data-bind="sel2"></td>
						<td cell-type="checkbox" data-bind="sel3" enable="data.REC1 > 70 ? true : false;"></td>
						<td cell-type="checkbox" data-bind="sel4" visible="data.REC1 > 70 ? true : false;"></td>
						<td cell-type="checkbox" data-bind="CHK1" text-align="left"></td>
						<td cell-type="checkbox" data-bind="CHK1" text-align="center"></td>
						<td cell-type="checkbox" data-bind="CHK1" text-align="right"></td>
						<td cell-type="checkbox" data-bind="CHK2" true-value="M" false-value="F"></td>
						<td cell-type="checkbox" data-bind="CHK2" text-align="right" true-value="M" false-value="F" true-text="Male" false-text="Female"></td>
						<td cell-type="checkbox" data-bind="CHK3" is-radio="true"></td>
					</tr>
					</tbody>
				</table>
			</nine-table>
		</>
	);
};

export default CheckBox;