import { useEffect, useRef, useState } from 'react';
import { exampleData } from '@/_data/example-data.js';
import { exampleProvider } from '@/_data/example-provider.js';
import { NINE_TABLE } from "@ninebone/datagrid";

const Renderer = () => {
	const DATA_CNT = 100000;
	const tableRef = useRef(null);
	const [isDark, setIsDark] = useState(true);

	const selectList = (params = {}) => {


		tableRef.current.loading = true;
		setTimeout(() => {
			tableRef.current.fields.add(["PIC"]);
			tableRef.current.data.set(exampleData.generateRandomData(DATA_CNT));
		})
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

		selectList();
	}, []);

	return (
		<>
			<h1>NineTable Cell Renderer & Expression Example</h1>

			<nine-table ref={tableRef} show-footer="true"
						theme={localStorage.getItem('nine_table_theme_dark') === 'true' ? 'dark' : undefined}
						className="no-vline"
						style={{width: '90%', height: '80vh'}}>
				<table row-indicator="true">
					<colgroup>
						<col width="200"/>
						<col width="40"/>
						<col width="40"/>
						<col width="40"/>
						<col width="40"/>
						<col width="40"/>
						<col width="40"/>
						<col width="40"/>
						<col width="40"/>
						<col width="40"/>
						<col width="40"/>
						<col width="40"/>
						<col width="40"/>
						<col width="40"/>
						<col width="40"/>
						<col width="40"/>
						<col width="40"/>
						<col width="40"/>
						<col width="40"/>
						<col width="40"/>
						<col width="40"/>
						<col width="40"/>
						<col width="40"/>
						<col width="40"/>
						<col width="40"/>
					</colgroup>
					<thead>
					<tr>
						<th rowSpan="2">Profile</th>
						<th colSpan="12">Current Year Forecast &amp; Actuals</th>
						<th colSpan="12">Next Year Projection &amp; Plan</th>
					</tr>
					<tr>
						<th>1</th>
						<th>2</th>
						<th>3</th>
						<th>4</th>
						<th>5</th>
						<th>6</th>
						<th>7</th>
						<th>8</th>
						<th>9</th>
						<th>10</th>
						<th>11</th>
						<th>12</th>
						<th>1</th>
						<th>2</th>
						<th>3</th>
						<th>4</th>
						<th>5</th>
						<th>6</th>
						<th>7</th>
						<th>8</th>
						<th>9</th>
						<th>10</th>
						<th>11</th>
						<th>12</th>
					</tr>
					</thead>
					<tbody>
					<tr>
						<td rowSpan="2" data-bind="NAME" data-expr="provider.renderProfileCard(data)" html="true"></td>
						<td data-bind="AMT1" data-expr="provider.renderAmountBar(data.AMT1, 'green')" html="true"></td>
						<td data-bind="AMT2" data-expr="provider.renderAmountBar(data.AMT2, 'green')" html="true"></td>
						<td data-bind="AMT3" data-expr="provider.renderAmountBar(data.AMT3, 'green')" html="true"></td>
						<td data-bind="AMT4" data-expr="provider.renderAmountBar(data.AMT4, 'green')" html="true"></td>
						<td data-bind="AMT5" data-expr="provider.renderAmountBar(data.AMT5, 'green')" html="true"></td>
						<td data-bind="AMT6" data-expr="provider.renderAmountBar(data.AMT6, 'green')" html="true"></td>
						<td data-bind="AMT7" data-expr="provider.renderAmountBar(data.AMT7, 'green')" html="true"></td>
						<td data-bind="AMT8" data-expr="provider.renderAmountBar(data.AMT8, 'green')" html="true"></td>
						<td data-bind="AMT9" data-expr="provider.renderAmountBar(data.AMT9, 'green')" html="true"></td>
						<td data-bind="AMT10" data-expr="provider.renderAmountBar(data.AMT10, 'green')" html="true"></td>
						<td data-bind="AMT11" data-expr="provider.renderAmountBar(data.AMT11, 'green')" html="true"></td>
						<td data-bind="AMT12" data-expr="provider.renderAmountBar(data.AMT12, 'green')" html="true"></td>
						<td data-bind="N_AMT1" data-expr="provider.renderAmountBar(data.N_AMT1, 'goldenrod')" html="true"></td>
						<td data-bind="N_AMT2" data-expr="provider.renderAmountBar(data.N_AMT2, 'goldenrod')" html="true"></td>
						<td data-bind="N_AMT3" data-expr="provider.renderAmountBar(data.N_AMT3, 'goldenrod')" html="true"></td>
						<td data-bind="N_AMT4" data-expr="provider.renderAmountBar(data.N_AMT4, 'goldenrod')" html="true"></td>
						<td data-bind="N_AMT5" data-expr="provider.renderAmountBar(data.N_AMT5, 'goldenrod')" html="true"></td>
						<td data-bind="N_AMT6" data-expr="provider.renderAmountBar(data.N_AMT6, 'goldenrod')" html="true"></td>
						<td data-bind="N_AMT7" data-expr="provider.renderAmountBar(data.N_AMT7, 'goldenrod')" html="true"></td>
						<td data-bind="N_AMT8" data-expr="provider.renderAmountBar(data.N_AMT8, 'goldenrod')" html="true"></td>
						<td data-bind="N_AMT9" data-expr="provider.renderAmountBar(data.N_AMT9, 'goldenrod')" html="true"></td>
						<td data-bind="N_AMT10" data-expr="provider.renderAmountBar(data.N_AMT10, 'goldenrod')" html="true"></td>
						<td data-bind="N_AMT11" data-expr="provider.renderAmountBar(data.N_AMT11, 'goldenrod')" html="true"></td>
						<td data-bind="N_AMT12" data-expr="provider.renderAmountBar(data.N_AMT12, 'goldenrod')" html="true"></td>
					</tr>
					<tr>
						<td colSpan="6"
							data-expr="provider.renderSerialChart('Revenue', 'cadetblue', data.AMT1,data.AMT2,data.AMT3,data.AMT4,data.AMT5,data.AMT6,data.AMT7,data.AMT8,data.AMT9,data.AMT10,data.AMT11,data.AMT12)"
							html="true"></td>
						<td colSpan="6"
							data-expr="provider.renderSerialChart('Budget', 'darkgoldenrod', data.N_AMT1,data.N_AMT2,data.N_AMT3,data.N_AMT4,data.N_AMT5,data.N_AMT6,data.N_AMT7,data.N_AMT8,data.N_AMT9,data.N_AMT10,data.N_AMT11,data.N_AMT12)"
							html="true"></td>
						<td colSpan="6"
							data-expr="provider.renderSerialChart('Revenue', 'cadetblue', data.AMT1,data.AMT2,data.AMT3,data.AMT4,data.AMT5,data.AMT6,data.AMT7,data.AMT8,data.AMT9,data.AMT10,data.AMT11,data.AMT12)"
							html="true"></td>
						<td colSpan="6"
							data-expr="provider.renderSerialChart('Budget', 'darkgoldenrod', data.N_AMT1,data.N_AMT2,data.N_AMT3,data.N_AMT4,data.N_AMT5,data.N_AMT6,data.N_AMT7,data.N_AMT8,data.N_AMT9,data.N_AMT10,data.N_AMT11,data.N_AMT12)"
							html="true"></td>
					</tr>
					</tbody>
				</table>
				<table row-indicator="true" auto-fit-col="true">
					<colgroup>
						<col width="300"/>
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
						<th rowSpan="2">Profile</th>
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
						<th collapsed="true">case #2 (html)</th>
						<th>case #3 (calculate)</th>
						<th>case #4 (with host)</th>
						<th>case #5 (html + host)</th>
						<th>color</th>
						<th>background</th>
					</tr>
					</thead>
					<tbody>
					<tr>
						<td data-bind="NAME" data-expr="provider.renderProfileCard(data)" html="true"></td>
						<td data-bind="AGE"></td>
						<td data-bind="REC1" text-align="left"></td>
						<td data-bind="REC2" text-align="center"></td>
						<td data-bind="REC3" text-align="right"></td>
						<td data-expr="data.NAME + ' (' + data.AGE + ')'"></td>
						<td data-expr="'[<b><font color=blue>' + data.AGE + '</font></b>] ' + data.NAME"
							html="true"></td>
						<td data-expr="Math.round((data.REC1 + data.REC2 + data.REC3) / 3)"></td>
						<td data-expr="provider.formatDecimalNumber((data.REC1 + data.REC2 + data.REC3) / 3, 2)"></td>
						<td data-expr="provider.renderBadge(data.REC1)" html="true"></td>
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