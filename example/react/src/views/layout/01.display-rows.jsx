import { useEffect, useRef } from 'react';
import { exampleData } from '@/_data/example-data.js';
import "@ninebone/datagrid";

const DisplayRows = () => {
	// 4개의 테이블을 위한 각각의 ref 선언
	const tableRef1 = useRef(null);
	const tableRef2 = useRef(null);
	const tableRef3 = useRef(null);
	const tableRef4 = useRef(null);

	// 공통 코드 제공자 등록 헬퍼
	const setupProvider = (tableRef) => {
		if (!tableRef.current) return;
		tableRef.current.provider.add({
			getCommonCode: (group) => {
				return exampleData.generateCommonCode(group);
			},
			style: `
                tr.first { height: 36px; }
                tr.second { height: 36px; }
                th.gray, td.gray {
                    background: white;
                    filter: brightness(0.95);
                }
            `,
		});
	};

	useEffect(() => {
		setupProvider(tableRef1);
		setupProvider(tableRef2);
		setupProvider(tableRef3);
		setupProvider(tableRef4);
	}, []);

	// 각 테이블별 액션 핸들러 생성 팩토리
	const createHandlers = (ref) => ({
		handleAppend: () => {
			if (!ref.current) return;
			const row = ref.current.row.add();
			ref.current.row.focus(row);
		},
		handleDelete: () => {
			if (!ref.current) return;
			const currentRow = ref.current.row.at();
			if (currentRow >= 0) {
				ref.current.row.remove(currentRow);
			} else {
				window.alert("Please select a row to delete.");
			}
		}
	});

	const h1 = createHandlers(tableRef1);
	const h2 = createHandlers(tableRef2);
	const h3 = createHandlers(tableRef3);
	const h4 = createHandlers(tableRef4);

	return (
		<div style={{ padding: '20px', maxWidth: '1600px', margin: '0 auto' }}>
			<h1 style={{ marginBottom: '24px', textAlign: 'center' }}>NineTable Vertical Auto-Height & Column Variation Test</h1>

			{/* 전체 레이아웃: 좌우 2열 구조 */}
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>

				{/* ================= 좌측 열 (Column 1: Table 1 & Table 2) ================= */}
				<div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

					{/* Table 1 */}
					<div style={sectionStyle}>
						<h3>Table 1 (Min Rows: none / Max Rows: none)</h3>
						<div style={buttonGroupStyle}>
							<button onClick={h1.handleAppend} style={buttonStyle}>Add Row</button>
							<button onClick={h1.handleDelete} style={{...buttonStyle, background: '#ff4d4f'}}>Delete Row</button>
						</div>
						<nine-table ref={tableRef1} auto-height="true" show-footer="false" style={{ width: '100%' }}>
							<table row-indicator="true">
								<colgroup>
									<col width="80"/><col width="60"/><col width="80"/><col width="60"/><col width="140"/><col width="60"/><col width="100"/>
								</colgroup>
								<thead>
								<tr className="first">
									<th>NAME</th>
									<th colSpan="2">AGE</th>
									<th colSpan="2">STATUS</th>
									<th colSpan="2">SEX</th>
								</tr>
								</thead>
								<tbody>
								<tr>
									<td data-bind="NAME"></td>
									<td data-bind="AGE" className="gray" text-align="center"></td>
									<td data-bind="AGE" cell-type="input" text-align="center"></td>
									<td data-bind="STATUS" className="gray" text-align="center"></td>
									<td cell-type="radio" data-bind="STATUS" text-align="center" data-source="provider.getCommonCode('STATUS')" key-name="code" value-name="codename"></td>
									<td data-bind="SEX" className="gray" text-align="center"></td>
									<td cell-type="checkbox" data-bind="SEX" true-value="M" false-value="F"></td>
								</tr>
								</tbody>
							</table>
						</nine-table>
					</div>

					{/* Table 2 */}
					<div style={sectionStyle}>
						<h3>Table 2 (Min Rows: 1 / Max Rows: none)</h3>
						<div style={buttonGroupStyle}>
							<button onClick={h2.handleAppend} style={buttonStyle}>Add Row</button>
							<button onClick={h2.handleDelete} style={{...buttonStyle, background: '#ff4d4f'}}>Delete Row</button>
						</div>
						<nine-table ref={tableRef2} auto-height="true" display-min-rows="1" show-footer="false" style={{ width: '100%' }}>
							<table row-indicator="true">
								<colgroup>
									<col width="100"/><col width="100"/><col width="150"/><col width="150"/>
								</colgroup>
								<thead>
								<tr className="first">
									<th>NAME</th>
									<th>AGE</th>
									<th>COLOR</th>
									<th>DATE</th>
								</tr>
								</thead>
								<tbody>
								<tr>
									<td data-bind="NAME"></td>
									<td data-bind="AGE" cell-type="input" text-align="center"></td>
									<td data-bind="COLOR1" cell-type="input-color" text-align="center"></td>
									<td data-bind="DATE" text-align="center"></td>
								</tr>
								</tbody>
							</table>
						</nine-table>
					</div>

				</div>

				{/* ================= 우측 열 (Column 2: Table 3 & Table 4) ================= */}
				<div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

					{/* Table 3 */}
					<div style={sectionStyle}>
						<h3>Table 3 (Min Rows: none / Max Rows: 5)</h3>
						<div style={buttonGroupStyle}>
							<button onClick={h3.handleAppend} style={buttonStyle}>Add Row</button>
							<button onClick={h3.handleDelete} style={{...buttonStyle, background: '#ff4d4f'}}>Delete Row</button>
						</div>
						<nine-table ref={tableRef3} auto-height="true" display-max-rows="5" show-footer="false" style={{ width: '100%' }}>
							<table row-indicator="true">
								<colgroup>
									<col width="70"/><col width="45"/><col width="70"/><col width="45"/><col width="120"/><col width="45"/><col width="70"/><col width="70"/><col width="80"/><col width="100"/><col width="100"/>
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
									<td cell-type="radio" data-bind="STATUS" text-align="center" data-source="provider.getCommonCode('STATUS')" key-name="code" value-name="codename"></td>
									<td data-bind="SEX" text-align="center" className="gray"></td>
									<td data-bind="SEX" cell-type="checkbox" true-value="M" false-value="F"></td>
									<td data-bind="COLOR1" text-align="center" className="gray"></td>
									<td data-bind="COLOR1" cell-type="input-color"></td>
									<td cell-type="radio" data-bind="SEX" data-source="provider.getCommonCode('SEX')" key-name="code" value-name="codename" enable="data.STATUS === 'C' ? true : false"></td>
									<td cell-type="radio" data-bind="SEX" data-source="provider.getCommonCode('SEX')" key-name="code" value-name="codename" visible="data.STATUS === 'C' ? true : false"></td>
								</tr>
								</tbody>
							</table>
						</nine-table>
					</div>

					{/* Table 4 */}
					<div style={sectionStyle}>
						<h3>Table 4 (Min Rows: 1 / Max Rows: 5)</h3>
						<div style={buttonGroupStyle}>
							<button onClick={h4.handleAppend} style={buttonStyle}>Add Row</button>
							<button onClick={h4.handleDelete} style={{...buttonStyle, background: '#ff4d4f'}}>Delete Row</button>
						</div>
						<nine-table ref={tableRef4} auto-height="true" display-min-rows="1" display-max-rows="5" show-footer="false" style={{ width: '100%' }}>
							<table row-indicator="true">
								<colgroup>
									<col width="120"/><col width="100"/><col width="150"/><col width="180"/><col width="150"/>
								</colgroup>
								<thead>
								<tr className="first">
									<th>FULL NAME</th>
									<th>STATUS</th>
									<th>SEX</th>
									<th>FAVORITE COLOR</th>
									<th>COMBO INFO</th>
								</tr>
								</thead>
								<tbody>
								<tr>
									<td data-bind="NAME" text-align="center"></td>
									<td data-bind="STATUS" text-align="center"></td>
									<td data-bind="SEX" text-align="center"></td>
									<td data-bind="COLOR1" cell-type="input-color" text-align="center"></td>
									<td data-bind="COMBO" text-align="center"></td>
								</tr>
								</tbody>
							</table>
						</nine-table>
					</div>

				</div>

			</div>
		</div>
	);
};

const sectionStyle = {
	border: '1px solid #ddd',
	padding: '20px',
	borderRadius: '6px',
	background: '#fafafa',
	boxSizing: 'border-box'
};

const buttonGroupStyle = {
	display: 'flex',
	gap: '8px',
	marginBottom: '12px'
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

export default DisplayRows;