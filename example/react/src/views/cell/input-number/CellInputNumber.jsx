import { useEffect, useRef } from 'react';
import { exampleData } from '@/_data/example-data.js';
import "@ninebone/datagrid";

const InputNumber = () => {
	const DATA_CNT = 100000;
	const tableRef = useRef(null);

	const selectList = (params = {}) => {
		tableRef.current.loading = true;
		setTimeout(() => {
			tableRef.current.data.set(exampleData.generateRandomData(DATA_CNT));
		})
	};

	useEffect(() => {

		tableRef.current.provider.add({
			checkNum: (n1,n2,n3) => {
				return Number(n1) + Number(n2) + Number(n3) > 100 ? true : false;
			},
		});

		selectList();
	}, []);

	return (
		<>
			<h1>NineTable High-Performance Editable Grid & Cell Validation Showcase</h1>

			<nine-table ref={tableRef} show-footer="true"
						theme={localStorage.getItem('nine_table_theme_dark') === 'true' ? 'dark' : undefined}
						style={{width: '90%', height: '80vh'}}>
				<table row-indicator="true" edit-trigger="click" caption="Edit on Click">
					<colgroup>
						<col width="80"/>
						<col width="100"/>
						<col width="100"/>
						<col width="100"/>
						<col width="100"/>
						<col width="100"/>
						<col width="100"/>
						<col width="100"/>
						<col width="100"/>
						<col width="100"/>
						<col width="100"/>
						<col width="100"/>
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
						<td data-bind="AMT1" cell-type="input-number" data-expr="Number(data.AMT1).toLocaleString()"></td>
						<td data-bind="AMT2" cell-type="input-number" data-expr="Number(data.AMT2).toLocaleString()"></td>
						<td data-bind="AMT3" cell-type="input-number" data-expr="Number(data.AMT3).toLocaleString()"></td>
						<td data-bind="AMT1" cell-type="input-number" data-expr="Number(data.AMT4).toLocaleString()" text-align="left" min="10"></td>
						<td data-bind="AMT2" cell-type="input-number" data-expr="Number(data.AMT5).toLocaleString()" text-align="center" max="90"></td>
						<td data-bind="AMT3" cell-type="input-number" data-expr="Number(data.AMT6).toLocaleString()" text-align="right" scale="2"></td>
						<td data-bind="AMT1" cell-type="input-number" data-expr="Number(data.AMT7).toLocaleString()" validator="data.AMT7 < 10000000 ? true : false"></td>
						<td data-bind="AMT2" cell-type="input-number" data-expr="Number(data.AMT8).toLocaleString()" validator="data.AMT8 < 10000000 ? true : false"></td>
						<td data-bind="AMT3" cell-type="input-number" data-expr="Number(data.AMT9).toLocaleString()"
							validator="provider.checkNum(data.AMT1,data.AMT2,data.AMT3)"></td>
						<td data-bind="AMT1" cell-type="input-number" data-expr="Number(data.AMT10).toLocaleString()" enable="data.AMT10 < 10000000 ? true : false"></td>
						<td data-bind="AMT2" cell-type="input-number" data-expr="Number(data.AMT11).toLocaleString()" visible="data.AMT11 < 10000000"></td>
					</tr>
					</tbody>
				</table>
				<table row-indicator="true" caption="Always Edit Mode">
					<colgroup>
						<col width="80"/>
						<col width="100"/>
						<col width="100"/>
						<col width="100"/>
						<col width="100"/>
						<col width="100"/>
						<col width="100"/>
						<col width="100"/>
						<col width="100"/>
						<col width="100"/>
						<col width="100"/>
						<col width="100"/>
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
						<th>AMT1</th>
						<th>AMT2</th>
						<th>AMT3</th>
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
						<td data-bind="AMT1" cell-type="input-number"></td>
						<td data-bind="AMT2" cell-type="input-number"></td>
						<td data-bind="AMT3" cell-type="input-number"></td>
						<td data-bind="AMT4" cell-type="input-number" text-align="left" min="10"></td>
						<td data-bind="AMT5" cell-type="input-number" text-align="center" max="90"></td>
						<td data-bind="AMT6" cell-type="input-number" text-align="right" scale="2"></td>
						<td data-bind="AMT7" cell-type="input-number" validator="data.AMT7 < 10000000 ? true : false"></td>
						<td data-bind="AMT8" cell-type="input-number" validator="data.AMT8 < 10000000 ? true : false"></td>
						<td data-bind="AMT9" cell-type="input-number"
							validator="provider.checkNum(data.AMT9,data.AMT10,data.AMT11)"></td>
						<td data-bind="AMT10" cell-type="input-number" enable="data.AMT10 < 10000000 ? true : false"></td>
						<td data-bind="AMT11" cell-type="input-number" visible="data.AMT11 < 10000000"></td>
					</tr>
					</tbody>
				</table>
			</nine-table>
		</>
	);
};

export default InputNumber;