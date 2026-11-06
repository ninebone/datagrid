import { useEffect, useRef } from 'react';
import { exampleData } from '@/_data/example-data.js';
import "@ninebone/datagrid";

const Combo = () => {
	const DATA_CNT = 100000;
	const tableRef = useRef(null);

	const selectList = (params = {}) => {
		tableRef.current.loading = true;
		setTimeout(() => {
			tableRef.current.data.set(exampleData.generateRandomData(DATA_CNT));
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
		selectCode();
		selectList();
	}, []);

	return (
		<>
			<h1>NineTable High-Performance Editable Grid & Cell Validation Showcase</h1>

			<nine-table ref={tableRef} show-footer="true" style={{width: '90%', height: '80%'}}>
				<table row-indicator="true">
					<colgroup>
						<col width="80" fixed="left"/>
						<col width="100" />
						<col width="200" />
						<col width="50"/>
						<col width="130"/>
						<col width="70"/>
						<col width="100"/>
						<col width="50"/>
						<col width="80"/>
						<col width="50"/>
						<col width="200"/>
						<col width="100"/>
						<col width="200"/>
					</colgroup>
					<thead>
					<tr>
						<th rowSpan="2" filtering="true">NAME</th>
						<th colSpan="2">Complex</th>
						<th colSpan="2">Few Items</th>
						<th colSpan="2">with Search</th>
						<th colSpan="2">with datalist</th>
						<th colSpan="2">multi select</th>
						<th colSpan="2">multi select (with Search)</th>
					</tr>
					<tr>
						<th style={{filter: 'brightness(0.95)'}}>code</th>
						<th>combo</th>
						<th style={{filter: 'brightness(0.95)'}}>code</th>
						<th>combo</th>
						<th style={{filter: 'brightness(0.95)'}}>code</th>
						<th>combo</th>
						<th style={{filter: 'brightness(0.95)'}}>code</th>
						<th>combo</th>
						<th style={{filter: 'brightness(0.95)'}}>code</th>
						<th>combo</th>
						<th style={{filter: 'brightness(0.95)'}}>code</th>
						<th>combo</th>
					</tr>
					</thead>
					<tbody>
					<tr>
						<td data-bind="NAME"></td>

						<td data-bind="COLOR3" text-align="center"
							style={{background: 'white', filter: 'brightness(0.98)'}}></td>
						<td cell-type="combo" data-bind="COLOR3" text-align="center" multi="true" items="codename,code"
							data-source="provider.getCommonCode('COLOR3')" key-name="code" value-name="codename"></td>

						<td data-bind="DEPART" text-align="center"
							style={{background: 'white', filter: 'brightness(0.98)'}}></td>
						<td cell-type="combo" data-bind="DEPART" text-align="center"
							data-source="provider.getCommonCode('DEPART')" key-name="code" value-name="codename"></td>

						<td data-bind="COLOR3" text-align="center"
							style={{background: 'white', filter: 'brightness(0.98)'}}></td>
						<td cell-type="combo" data-bind="COLOR3" text-align="center"
							data-source="provider.getCommonCode('COLOR3')" key-name="code" value-name="codename"></td>

						<td data-bind="DEPART1" text-align="center"
							style={{background: 'white', filter: 'brightness(0.98)'}}></td>
						<td cell-type="combo" data-bind="DEPART2" text-align="center">
							<datalist>
								<option k="A" v="#AAA"/>
								<option k="B" v="#BBB"/>
								<option k="C" v="#CCC"/>
							</datalist>
						</td>

						<td data-bind="DEPART2" text-align="center"
							style={{background: 'white', filter: 'brightness(0.98)'}}></td>
						<td cell-type="combo" data-bind="DEPART2" text-align="center" multi="true"
							data-source="provider.getCommonCode('DEPART')" key-name="code" value-name="codename"></td>

						<td data-bind="COLOR3" text-align="center"
							style={{background: 'white', filter: 'brightness(0.98)'}}></td>
						<td cell-type="combo" data-bind="COLOR3" text-align="center" multi="true"
							data-source="provider.getCommonCode('COLOR3')" key-name="code" value-name="codename"></td>
					</tr>
					</tbody>
				</table>
			</nine-table>
		</>
	);
};

export default Combo;