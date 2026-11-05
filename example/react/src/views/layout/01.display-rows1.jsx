import { useEffect, useRef } from 'react';
import { exampleData } from '@/_data/example-data.js';
import "@ninebone/datagrid";

const Radio = () => {
	const DATA_CNT = 1000;
	const tableRef = useRef(null);

	const selectList = (params = {}) => {
		tableRef.current.loading = true;
		setTimeout(() => {
			tableRef.current.data.set(exampleData.generateRandomData(DATA_CNT));
		})
	};

	const selectCode = async () => {
		setTimeout( () => {
			tableRef.current.provider.add({
				getCommonCode: (group) => {
					return exampleData.generateCommonCode(group);
				},
			});
		});
	};

	const handleInsert = () => {

		const currentRow = Math.max(tableRef.current.row.at(), 0);
		const row = tableRef.current.row.insert(currentRow);
		tableRef.current.row.focus(row);
	};

	const handleAppend = () => {
		const row = tableRef.current.row.add();
		tableRef.current.row.focus(row);
	};

	const handleDelete = () => {

		const currentRow = tableRef.current.row.at();
		if (currentRow >= 0) {
			tableRef.current.row.remove(currentRow);
		}
		else {
			nine.alert("Please select a row to delete.");
		}
	};

	const handleGetChanged = () => {

		const { C,U,D } = tableRef.current.data.getChangedData() || {};

		trace.log("[Data Changes Summary]", {
			inserted: C,
			updated: U,
			deleted: D,
		});

		nine.alert(`Changed data count - Inserted: ${C.length}, Updated: ${U.length}, Deleted: ${D.length}`).rgb().shake();
	};

	useEffect(() => {

		tableRef.current.provider.add({
			style: `
				tr.first {
					height: 36px;
				}
				tr.second {
					height: 36px;
				}
                th.gray,td.gray {
                	background: 'white';
                    filter: brightness(0.95);
                }
            `,
		});

		selectCode();
		selectList();
	}, []);

	return (
		<>
			<h1>NineTable High-Performance Editable Grid & Cell Validation Showcase</h1>

			<div style={{width: '90%', display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '10px'}}>
				<button onClick={handleInsert} style={buttonStyle}>Insert Row</button>
				<button onClick={handleAppend} style={buttonStyle}>Add Row</button>
				<button onClick={handleDelete} style={{...buttonStyle, background: '#ff4d4f'}}>Delete Row</button>
				<button onClick={handleGetChanged} style={{...buttonStyle, background: '#1890ff'}}>Get Changed</button>
			</div>

			<nine-table ref={tableRef} auto-height="true" display-min-rows="2" display-max-rows="3" show-footer="true" style={{width: '90%', height: '80%'}}>
				<table row-indicator="true">
					<colgroup>
						<col width="80"/>
						<col width="50"/>
						<col width="80"/>
						<col width="50"/>
						<col width="170"/>
						<col width="50"/>
						<col width="80"/>
						<col width="80"/>
						<col width="100"/>
						<col width="130"/>
						<col width="130"/>
					</colgroup>
					<thead>
					<tr className="first">
						<th rowSpan="2">NAME</th>
						<th colSpan="2">INPUT</th>
						<th colSpan="2">INPUT-RADIO</th>
						<th colSpan="2">INPUT-CHECKBOX</th>
						<th colSpan="2">INPUT-COLOR</th>
						<th rowSpan="2">INPUT-DATE</th>
						<th rowSpan="2">INPUT-COMBO</th>
					</tr>
					<tr className="second">
						<th className="gray">data</th>
						<th>text editor</th>
						<th className="gray">data</th>
						<th>radio</th>
						<th className="gray">data</th>
						<th>checkbox</th>
						<th className="gray">data</th>
						<th>renderer</th>
					</tr>
					</thead>
					<tbody>
					<tr>
						<td data-bind="NAME" rowSpan="2"></td>

						<td data-bind="AGE" text-align="center" className="gray"></td>
						<td data-bind="AGE" cell-type="input" text-align="center"></td>

						<td data-bind="STATUS" text-align="center" className="gray"></td>
						<td cell-type="radio" data-bind="STATUS" text-align="center"
							data-source="provider.getCommonCode('STATUS')" key-name="code" value-name="codename"></td>

						<td data-bind="SEX" text-align="center" className="gray"></td>
						<td data-bind="SEX" cell-type="checkbox" true-value="M" false-value="F"></td>

						<td data-bind="COLOR1" text-align="center" className="gray"></td>
						<td data-bind="COLOR1" cell-type="input-color"></td>

						<td cell-type="radio" data-bind="SEX" data-source="provider.getCommonCode('SEX')"
							key-name="code" value-name="codename"
							enable="data.STATUS === 'C' ? true : false"></td>

						<td cell-type="radio" data-bind="SEX" data-source="provider.getCommonCode('SEX')"
							key-name="code" value-name="codename"
							visible="data.STATUS === 'C' ? true : false"></td>
					</tr>
					<tr>
						<td colSpan="2" text-align="center"></td>

						<td colSpan="2" text-align="center"></td>

						<td colSpan="2" text-align="center"></td>

						<td colSpan="2" text-align="center"></td>

						<td colSpan="2" text-align="center"></td>
					</tr>
					</tbody>
				</table>

				<table row-indicator="true">
					<colgroup>
						<col width="80"/>
						<col width="50"/>
						<col width="80"/>
						<col width="50"/>
						<col width="170"/>
						<col width="50"/>
						<col width="80"/>
						<col width="80"/>
						<col width="100"/>
						<col width="130"/>
						<col width="130"/>
					</colgroup>
					<thead>
					<tr className="first">
						<th rowSpan="2">NAME</th>
						<th colSpan="2">INPUT</th>
						<th colSpan="2">INPUT-RADIO</th>
						<th colSpan="2">INPUT-CHECKBOX</th>
						<th colSpan="2">INPUT-COLOR</th>
						<th rowSpan="2">INPUT-DATE</th>
						<th rowSpan="2">INPUT-COMBO</th>
					</tr>
					<tr className="second">
						<th className="gray">data</th>
						<th>text editor</th>
						<th className="gray">data</th>
						<th>radio</th>
						<th className="gray">data</th>
						<th>checkbox</th>
						<th className="gray">data</th>
						<th>renderer</th>
					</tr>
					</thead>
					<tbody>
					<tr>
						<td data-bind="NAME"></td>

						<td data-bind="AGE" text-align="center" className="gray"></td>
						<td data-bind="AGE" cell-type="input" text-align="center"></td>

						<td data-bind="STATUS" text-align="center" className="gray"></td>
						<td cell-type="radio" data-bind="STATUS" text-align="center"
							data-source="provider.getCommonCode('STATUS')" key-name="code" value-name="codename"></td>

						<td data-bind="SEX" text-align="center" className="gray"></td>
						<td data-bind="SEX" cell-type="checkbox" true-value="M" false-value="F"></td>

						<td data-bind="COLOR1" text-align="center" className="gray"></td>
						<td data-bind="COLOR1" cell-type="input-color"></td>

						<td cell-type="radio" data-bind="SEX" data-source="provider.getCommonCode('SEX')"
							key-name="code" value-name="codename"
							enable="data.STATUS === 'C' ? true : false"></td>

						<td cell-type="radio" data-bind="SEX" data-source="provider.getCommonCode('SEX')"
							key-name="code" value-name="codename"
							visible="data.STATUS === 'C' ? true : false"></td>
					</tr>
					</tbody>
				</table>
			</nine-table>
		</>
	);
};

const buttonStyle = {
	padding: '6px 14px',
	color: 'white',
	cursor: 'pointer',
	borderRadius: '4px',
	border: '1px solid #d9d9d9',
	background: 'green',
	fontWeight: '500',
	fontSize: '13px'
};

export default Radio;