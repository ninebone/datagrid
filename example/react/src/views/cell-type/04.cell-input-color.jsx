import { useEffect, useRef } from 'react';
import { exampleData } from '@/_data/example-data.js';
import "@ninebone/datagrid";

const InputColor = () => {
	const DATA_CNT = 100000;
	const tableRef = useRef(null);

	const selectList = (params = {}) => {
		tableRef.current.loading = true;
		setTimeout(() => {
			tableRef.current.data.set(exampleData.generateRandomData(DATA_CNT));
		})
	};

	const selectCode = async () => {
		//setTimeout( () => {
			tableRef.current.addProvider({
				getColorList: (v) => {
					const rawList = exampleData.generateCommonCode((v > 50) ? "COLOR" : "COLOR2");
					return rawList.map(item => ({
						...item,
						value: item.code
					}));
				},
			});
		//}, 1000);
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
						<th colSpan="2">SAMPLE DATA</th>
						<th colSpan="3">COLOR1</th>
						<th colSpan="3">COLOR2</th>
						<th colSpan="2">data-source</th>
					</tr>
					<tr>
						<th>COLOR1</th>
						<th>COLOR2</th>
						<th>normal</th>
						<th>enable</th>
						<th>visible</th>
						<th>normal</th>
						<th>enable</th>
						<th>visible</th>
						<th>datalist</th>
						<th>data-source</th>
					</tr>
					</thead>
					<tbody>
					<tr>
						<td data-bind="NAME"></td>
						<td data-bind="COLOR1" text-align="center" background-color="data.COLOR1" color="nine.oppositeColor(data.COLOR1)"></td>
						<td data-bind="COLOR2" text-align="center" background-color="data.COLOR2" color="nine.oppositeColor(data.COLOR2)"></td>
						<td data-bind="COLOR1" cell-type="input-color"></td>
						<td data-bind="COLOR1" cell-type="input-color" enable="data.REC1 > 70 ? true : false;"></td>
						<td data-bind="COLOR1" cell-type="input-color" visible="data.REC1 > 70 ? true : false;"></td>
						<td data-bind="COLOR2" cell-type="input-color"></td>
						<td data-bind="COLOR2" cell-type="input-color" enable="data.REC1 > 70 ? true : false;"></td>
						<td data-bind="COLOR2" cell-type="input-color" visible="data.REC1 > 70 ? true : false;"></td>
						<td data-bind="COLOR1" cell-type="input-color">
							<datalist>
								<option value="#00ff00"/>
								<option value="#0000ff"/>
							</datalist>
						</td>
						<td data-bind="COLOR2" cell-type="input-color" data-source="provider.getColorList(data.REC1)"></td>
					</tr>
					</tbody>
				</table>
			</nine-table>
		</>
	);
};

export default InputColor;