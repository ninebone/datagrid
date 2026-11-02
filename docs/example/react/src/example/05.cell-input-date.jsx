import { useScreen, useState, useEffect, useRef } from 'react';
import { nine, trace } from '@ninebone/util'
import { NINE_TABLE } from '@ninebone/table'
// 상대 경로 대신 별칭 사용
import { exampleData } from '../_data/example-data.js';

const InputDate = () => {
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
						<col width="90"/>
						<col width="130"/>
						<col width="50"/>
						<col width="70"/>
						<col width="80"/>
						<col width="120"/>
						<col width="190"/>
						<col width="100"/>
						<col width="110"/>
						<col width="130"/>
						<col width="120"/>
					</colgroup>
					<thead>
					<tr>
						<th rowSpan="2">NAME</th>
						<th colSpan="5">SAMPLE DATA</th>
						<th colSpan="5">input-date</th>
						<th rowSpan="2">*</th>
					</tr>
					<tr>
						<th>Date</th>
						<th>Datetime</th>
						<th>Time</th>
						<th>Month</th>
						<th>Week</th>
						<th>date</th>
						<th>datetime-local</th>
						<th>time</th>
						<th>month</th>
						<th>week</th>
					</tr>
					</thead>
					<tbody>
					<tr>
						<td data-bind="NAME"></td>
						<td data-bind="BIRTH_YMD"></td>
						<td data-bind="BIRTH_DT"></td>
						<td data-bind="T"></td>
						<td data-bind="M"></td>
						<td data-bind="W"></td>
						<td data-bind="BIRTH_YMD" cell-type="input-date"></td>
						<td data-bind="BIRTH_DT" cell-type="input-date" date-type="datetime-local"></td>

						<td data-bind="T" cell-type="input-date" date-type="time"></td>
						<td data-bind="M" cell-type="input-date" date-type="month"></td>
						<td data-bind="W" cell-type="input-date" date-type="week"></td>
						<td data-bind="BIRTH_YMD" cell-type="input-date"></td>
					</tr>
					</tbody>
				</table>
			</nine-table>
		</>
	);
};

export default InputDate;