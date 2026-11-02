import { useScreen, useState, useEffect, useRef } from 'react';
import { nine, trace } from '@ninebone/util'
import { NINE_TABLE } from '@ninebone/table'
// 상대 경로 대신 별칭 사용
import { exampleData } from '../_data/example-data.js';

const InputText = () => {
	const DATA_CNT = 100000;
	const tableRef = useRef(null);

	const selectList = (params = {}) => {
		tableRef.current.loading = true;
		setTimeout(() => {
			tableRef.current.data.set(exampleData.generateRandomData(DATA_CNT));
		})
	};

	useEffect(() => {

		tableRef.current.checkName = (v) => {
			return nine.getByteLength(v) > 15 ? false : true;
		};

		selectList();
	}, []);

	return (
		<>
			<h1>NineTable High-Performance Editable Grid & Cell Validation Showcase</h1>

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
						<col width="150"/>
						<col width="150"/>
						<col width="150"/>
						<col width="150"/>
					</colgroup>
					<thead>
					<tr>
						<th rowSpan="2">NAME</th>
						<th rowSpan="2">AGE</th>
						<th colSpan="3">text-align</th>
						<th colSpan="1" rowSpan="2">maxbyte=15</th>
						<th colSpan="3">validator</th>
						<th rowSpan="2">enable</th>
						<th rowSpan="2">visible</th>
					</tr>
					<tr>
						<th>left</th>
						<th>center</th>
						<th>right</th>
						<th>case #1 (expr)</th>
						<th>case #2 (expr)</th>
						<th>case #3 (with host)</th>
					</tr>
					</thead>
					<tbody>
					<tr>
						<td data-bind="NAME"></td>
						<td data-bind="AGE"></td>
						<td data-bind="REC1" cell-type="input" text-align="left"></td>
						<td data-bind="REC2" cell-type="input" text-align="center"></td>
						<td data-bind="REC3" cell-type="input" text-align="right"></td>
						<td data-bind="NAME" cell-type="input" max-byte="15"></td>
						<td data-bind="NAME" cell-type="input" validator="!(nine.getByteLength(data.NAME) > 15)"></td>
						<td data-bind="NAME" cell-type="input" validator="!data.NAME.includes('i')"></td>
						<td data-bind="NAME" cell-type="input" validator="host.checkName(data.NAME)"></td>
						<td data-bind="NAME" cell-type="input" enable="data.REC1 < 50 ? true : false"></td>
						<td data-bind="NAME" cell-type="input" visible="data.REC1 < 50"></td>
					</tr>
					</tbody>
				</table>
			</nine-table>
		</>
	);
};

export default InputText;