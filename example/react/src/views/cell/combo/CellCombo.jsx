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
		/**
		 * Fields defined in the table markup are registered automatically.
		 * Add extra fields here that aren't in the design but are needed by custom providers.
		 * */
		tableRef.current.addEventListener(NINE_TABLE.EVENT.LOAD, (e) => {
			tableRef.current.fields.add(["PIC", "EMAIL", "STATUS", "DEPART"]);
		}, { once: true });

		tableRef.current.provider.add?.({
			...exampleProvider,
			style: `
                .td-amt { color: #999; font-size: 9px; text-align: right; }
            `,
			formatDecimalNumber: (num, decimals = 2) => {
				if (isNaN(num)) return 0;
				const factor = Math.pow(10, decimals);
				return Math.round(num * factor) / factor;
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
				<table row-indicator="true" edit-trigger="click" caption="Edit on Click">
					<colgroup>
						<col width="200" fixed="left"/>
						<col width="100"/>
						<col width="200"/>
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
						<th rowSpan="2">Profile</th>
						<th colSpan="2">Complex</th>
						<th colSpan="2">Few Items</th>
						<th colSpan="2">with Search</th>
						<th colSpan="2">with datalist</th>
						<th colSpan="2">multi select</th>
						<th colSpan="2">multi select (with Search)</th>
					</tr>
					<tr>
						<th filtering="true" style={{filter: 'brightness(0.95)'}}>code</th>
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
						<td data-bind="NAME" data-expr="provider.renderProfileCard(data)" html="true"></td>

						<td data-bind="COLOR3" text-align="center"
							style={{filter: 'brightness(0.98)'}}></td>
						<td cell-type="combo" data-bind="COLOR3" multi="true" items="codename,code"
							data-source="provider.getCommonCode('COLOR3')" key-name="code" value-name="codename"></td>

						<td data-bind="DEPART" text-align="center"
							style={{filter: 'brightness(0.98)'}}></td>
						<td cell-type="combo" data-bind="DEPART"
							data-source="provider.getCommonCode('DEPART')" key-name="code" value-name="codename"></td>

						<td data-bind="COLOR3" text-align="center"
							style={{filter: 'brightness(0.98)'}}></td>
						<td cell-type="combo" data-bind="COLOR3"
							data-source="provider.getCommonCode('COLOR3')" key-name="code" value-name="codename"></td>

						<td data-bind="DEPART1" text-align="center"
							style={{filter: 'brightness(0.98)'}}></td>
						<td cell-type="combo" data-bind="DEPART1">
							<datalist>
								<option k="A" v="#AAA"/>
								<option k="B" v="#BBB"/>
								<option k="C" v="#CCC"/>
							</datalist>
						</td>

						<td data-bind="DEPART2" text-align="center"
							style={{filter: 'brightness(0.98)'}}></td>
						<td cell-type="combo" data-bind="DEPART2" multi="true"
							data-source="provider.getCommonCode('DEPART')" key-name="code" value-name="codename"
							enable="data.REC1 > 70 ? true : false;"></td>

						<td data-bind="COLOR3" text-align="center"
							style={{filter: 'brightness(0.98)'}}></td>
						<td cell-type="combo" data-bind="COLOR3" multi="true"
							data-source="provider.getCommonCode('COLOR3')" key-name="code" value-name="codename"
							visible="data.REC1 > 70 ? true : false;"></td>
					</tr>
					</tbody>
				</table>
				<table row-indicator="true" caption="Always Edit Mode">
					<colgroup>
						<col width="200" fixed="left"/>
						<col width="100"/>
						<col width="200"/>
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
						<th rowSpan="2">Profile</th>
						<th colSpan="2">Complex</th>
						<th colSpan="2">Few Items</th>
						<th colSpan="2">with Search</th>
						<th colSpan="2">with datalist</th>
						<th colSpan="2">multi select</th>
						<th colSpan="2">multi select (with Search)</th>
					</tr>
					<tr>
						<th filtering="true" style={{filter: 'brightness(0.95)'}}>code</th>
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
						<td data-bind="NAME" data-expr="provider.renderProfileCard(data)" html="true"></td>

						<td data-bind="COLOR3" text-align="center"
							style={{filter: 'brightness(0.98)'}}></td>
						<td cell-type="combo" data-bind="COLOR3" text-align="center" multi="true" items="codename,code"
							data-source="provider.getCommonCode('COLOR3')" key-name="code" value-name="codename"></td>

						<td data-bind="DEPART" text-align="center"
							style={{filter: 'brightness(0.98)'}}></td>
						<td cell-type="combo" data-bind="DEPART" text-align="center"
							data-source="provider.getCommonCode('DEPART')" key-name="code" value-name="codename"></td>

						<td data-bind="COLOR3" text-align="center"
							style={{filter: 'brightness(0.98)'}}></td>
						<td cell-type="combo" data-bind="COLOR3" text-align="center"
							data-source="provider.getCommonCode('COLOR3')" key-name="code" value-name="codename"></td>

						<td data-bind="DEPART1" text-align="center"
							style={{filter: 'brightness(0.98)'}}></td>
						<td cell-type="combo" data-bind="DEPART1" text-align="center">
							<datalist>
								<option k="A" v="#AAA"/>
								<option k="B" v="#BBB"/>
								<option k="C" v="#CCC"/>
							</datalist>
						</td>

						<td data-bind="DEPART2" text-align="center"
							style={{filter: 'brightness(0.98)'}}></td>
						<td cell-type="combo" data-bind="DEPART2" text-align="center" multi="true"
							data-source="provider.getCommonCode('DEPART')" key-name="code" value-name="codename"
							enable="data.REC1 > 70 ? true : false;"></td>

						<td data-bind="COLOR3" text-align="center"
							style={{filter: 'brightness(0.98)'}}></td>
						<td cell-type="combo" data-bind="COLOR3" text-align="center" multi="true"
							data-source="provider.getCommonCode('COLOR3')" key-name="code" value-name="codename"
							visible="data.REC1 > 70 ? true : false;"></td>
					</tr>
					</tbody>
				</table>
			</nine-table>
		</>
	);
};

export default Combo;