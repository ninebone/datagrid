import { useScreen, useState, useEffect, useRef } from 'react';
import { nine, trace } from '@ninebone/util'
import { NINE_TABLE } from '@ninebone/table'
// 상대 경로 대신 별칭 사용
import { exampleData } from '@/_data/example-data.js';

const Combo = () => {
	const DATA_CNT = 100000;
	const tableRef = useRef(null);

	const selectCode = async () => {
		setTimeout( () => {
			tableRef.current.getCommonCode = (group) => {
				return exampleData.generateCommonCode(group);
			};
		});
	};

	const selectList = (params = {}) => {
		tableRef.current.loading = true;
		setTimeout(() => {
			tableRef.current.data.set(exampleData.generateRandomData(DATA_CNT));
		})
	};

	useEffect(() => {
		selectCode();
		selectList();
	}, []);

	return (
		<>
			<h1>NineTable High-Performance Editable Grid & Cell Validation Showcase</h1>

			<nine-table ref={tableRef} show-footer="true" style={{width: '90%', height: '80%'}}>
				<table row-indicator="true">
					<colgroup>
						<col width="80"/>
						<col width="50"/>
						<col width="50"/>
						<col width="50"/>
						<col width="80"/>
						<col width="80"/>
						<col width="80"/>
						<col width="80"/>
						<col width="80"/>
						<col width="80"/>
						<col width="80"/>
						<col width="80"/>
					</colgroup>
					<thead>
					<tr>
						<th rowSpan="2">NAME</th>
						<th colSpan="3">SAMPLE DATA</th>
						<th colSpan="3">constraints & text-align</th>
						<th colSpan="3">validate</th>
						<th rowSpan="2">enable</th>
						<th rowSpan="2">visible</th>
					</tr>
					<tr>
						<th>REC1</th>
						<th>REC2</th>
						<th>REC3</th>
						<th>min=10</th>
						<th>max=90</th>
						<th>scale=2</th>
						<th>case #1</th>
						<th>case #2</th>
						<th>case #3</th>
					</tr>
					</thead>
					<tbody>
					<tr>
						<td data-bind="NAME"></td>
						<td data-bind="REC1" cell-type="input-number"></td>
						<td data-bind="REC2" cell-type="input-number"></td>
						<td data-bind="REC3" cell-type="input-number"></td>
						<td cell-type="combo" data-bind="DEPART" data-source="host.getCommonCode('DEPART')"
							key-name="code" value-name="codename"></td>
						<td cell-type="combo" data-bind="DEPART" visible="data.REC1 > 50 ? true : false;"
							enable="data.REC1 > 70 ? true : false;">
							<datalist>
								<option k="A" v="aaa a"/>
								<option k="B" v="bb b"/>
								<option k="C" v="c c"/>
							</datalist>
						</td>
						<td data-bind="REC3" cell-type="input-number" text-align="right" scale="2"></td>
						<td data-bind="REC1" cell-type="input-number" validator="data.REC1 < 50 ? true : false"></td>
						<td data-bind="REC2" cell-type="input-number" validator="data.REC2 < 50 ? true : false"></td>
						<td data-bind="REC3" cell-type="input-number"
							validator="host.checkNum(data.REC1,data.REC2,data.REC3)"></td>
						<td data-bind="REC1" cell-type="input-number" enable="data.REC1 < 50 ? true : false"></td>
						<td data-bind="REC2" cell-type="input-number" visible="data.REC2 < 50"></td>
					</tr>
					</tbody>
				</table>
			</nine-table>
		</>
	);
};

export default Combo;