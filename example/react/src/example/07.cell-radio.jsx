import { useEffect, useRef } from 'react';
import { exampleData } from '../_data/example-data.js';
import "@ninebone/datagrid";

const Radio = () => {
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
						<col width="80"/>
						<col width="50"/>
						<col width="130"/>
						<col width="50"/>
						<col width="170"/>
						<col width="50"/>
						<col width="260"/>
						<col width="50"/>
						<col width="190"/>
						<col width="130"/>
						<col width="130"/>
					</colgroup>
					<thead>
					<tr>
						<th rowSpan="2">NAME</th>
						<th colSpan="2">SEX</th>
						<th colSpan="2">STATUS</th>
						<th colSpan="2">DEPART (data-source)</th>
						<th colSpan="2">DEPART1 (datalist)</th>
						<th rowSpan="2">enable</th>
						<th rowSpan="2">visible</th>
					</tr>
					<tr>
						<th style={{filter: 'brightness(0.95)'}}>code</th>
						<th>radio</th>
						<th style={{filter: 'brightness(0.95)'}}>code</th>
						<th>radio</th>
						<th style={{filter: 'brightness(0.95)'}}>code</th>
						<th>radio</th>
						<th style={{filter: 'brightness(0.95)'}}>code</th>
						<th>radio</th>
					</tr>
					</thead>
					<tbody>
					<tr>
						<td data-bind="NAME"></td>

						<td data-bind="SEX" text-align="center"
							style={{ background: 'white', filter:'brightness(0.98)' }}></td>
						<td cell-type="radio" data-bind="SEX" text-align="center"
							data-source="host.getCommonCode('SEX')" key-name="code" value-name="codename"></td>

						<td data-bind="STATUS" text-align="center"
							style={{ background: 'white', filter:'brightness(0.98)' }}></td>
						<td cell-type="radio" data-bind="STATUS" text-align="center"
							data-source="host.getCommonCode('STATUS')" key-name="code" value-name="codename"></td>

						<td data-bind="DEPART" text-align="center"
							style={{ background: 'white', filter:'brightness(0.98)' }}></td>
						<td cell-type="radio" data-bind="DEPART" text-align="center"
							data-source="host.getCommonCode('DEPART')" key-name="code" value-name="codename"></td>


						<td data-bind="DEPART1" text-align="center"
							style={{ background: 'white', filter:'brightness(0.98)' }}></td>
						<td cell-type="radio" data-bind="DEPART1" text-align="center">
							<datalist>
								<option k="A" v="#AAA"/>
								<option k="B" v="#BBB"/>
								<option k="C" v="#CCC"/>
							</datalist>
						</td>

						<td cell-type="radio" data-bind="SEX" data-source="host.getCommonCode('SEX')"
							key-name="code" value-name="codename"
							enable="data.STATUS === 'C' ? true : false"></td>

						<td cell-type="radio" data-bind="SEX" data-source="host.getCommonCode('SEX')"
							key-name="code" value-name="codename"
							visible="data.STATUS === 'C' ? true : false"></td>
					</tr>
					</tbody>
				</table>
			</nine-table>
		</>
	);
};

export default Radio;