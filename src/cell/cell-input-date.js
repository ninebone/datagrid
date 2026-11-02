import { trace } from "@nopeer";
import { EditableCellElement } from "./core/CellElement.js";

class CellInputDate extends EditableCellElement
{
	#target;
	#type;

	constructor () {
		super();
	}

	connectedCallback() {
		super.connectedCallback();

		this.#renderer();

		this.#target = this.querySelector("input");

		this.#target.addEventListener("input", (event) => {
			const val = event.target.value;
			this.value = val;
			this.#target.classList.toggle("has-value", !!val); // 💡 실시간 반영
			this.#validate(val);

			super.sheet.rowManager.refresh(true);
		});

		this.#target.addEventListener("change", (event) => {
			const val = event.target.value;
			this.value = val;
			this.#validate(val);

			super.sheet.rowManager.refresh(true);
		});
	};

	#renderer = () => {

		this.#type = this.cell.getAttribute("date-type") || "date";
		if (!["date","datetime-local","time","week","month"].includes(this.#type)) {
			throw `invalid type : ${this.#type}`;
		}

		let attr = [];
		for (let i = 0; i < this.cell.attributes.length; i++) {
			if (["value", "max", "min", "step"].includes(this.cell.attributes[i].name)) {
				attr.push(`${this.cell.attributes[i].name}="${this.cell.attributes[i].value}"`);
			}
		}

		this.innerHTML = `
          <input
             type="${this.#type}"
             data-placeholder="${this.cell.getAttribute('placeholder') || 'Select'}"
             ${attr.join(" ")}
             required
          />
       `;
	};

	refresh = () => {

		const v = super.refresh();

		let formattedVal = v;
		if (formattedVal) {

			switch (this.#type) {
				case "date":
					formattedVal = formattedVal.substr(0, 10);
					break;
				case "datetime-local":
					formattedVal = formattedVal.substr(0, 16);
					break;
				case "time":
					var d = new Date(v);
					if (d != "Invalid Date" && !isNaN(d)) {
						formattedVal = ("00" + d.getHours()).slice(-2) + ":" + ("00" + d.getMinutes()).slice(-2);
					}
					break;
				case "month":
					var d = new Date(v);
					if (d != "Invalid Date" && !isNaN(d)) {
						formattedVal = ("0000" + d.getFullYear()).slice(-4) + "-" + ("00" + (d.getMonth() + 1)).slice(-2);
					}
					break;
			}
		}

		this.#target.value = formattedVal || "";
		this.#target.classList.toggle("has-value", !!formattedVal); // 💡 값이 있으면 클래스 추가

		if (this.isValid()) {
			this.#validate(formattedVal);
		}
	};

	#validate = (val) => {

		if (val !== "" && val !== null && val !== undefined) {
			let isValid = this.#isValidDate(val);

			if (isValid) {
				if (this.#min && val < this.#min) isValid = false;
				if (this.#max && val > this.#max) isValid = false;
			}

			if (!isValid) {
				super.cell.classList.add("invalid");
			}
		}
	};

	#isValidDate = (v) => {

		if (typeof v !== "string") return false;

		let isValid = true;

		switch (this.#type) {
			case "date":
			case "datetime-local":
				const year  = Number(v.substr(0, 4));
				const month = Number(v.substr(5, 2));
				const day   = Number(v.substr(8, 2));

				if (isNaN(year) || isNaN(month) || isNaN(day)) {
					isValid = false;
				} else if (month < 1 || month > 12 || day < 1 || day > 31) {
					isValid = false;
				} else if ([4, 6, 9, 11].includes(month) && day == 31) {
					isValid = false;
				} else if (month == 2) {
					let isleap = (year % 4 == 0 && (year % 100 != 0 || year % 400 == 0));
					if (day > 29 || (day == 29 && !isleap)) {
						isValid = false;
					}
				}
				break;
		}

		if (isValid) {
			switch (this.#type) {
				case "datetime-local":
					var t    = v.substr(10, 1);
					var hour = Number(v.substr(11, 2));
					var min  = Number(v.substr(14, 2));

					if (t != "T") {
						isValid = false;
					} else if (isNaN(hour) || isNaN(min)) {
						isValid = false;
					} else if (hour < 0 || hour > 23 || min < 0 || min > 59) {
						isValid = false;
					}
					break;

				case "month":
					var year  = Number(v.substr(0, 4));
					var month = Number(v.substr(5, 2));

					if (isNaN(year) || isNaN(month)) {
						isValid = false;
					} else if (month < 1 || month > 12) {
						isValid = false;
					}
					break;

				case "week":
					var year = Number(v.substr(0, 4));
					var w    = v.substr(5, 1);
					var week = Number(v.substr(6, 2));

					if (w != "W") {
						isValid = false;
					} else if (isNaN(year) || isNaN(week)) {
						isValid = false;
					} else if (week <= 0 || week > 53) {
						isValid = false;
					}
					break;
			}
		}

		return isValid;
	}

	get #min() {
		return this.cell.getAttribute("min");
	}

	get #max() {
		return this.cell.getAttribute("max");
	}

	get #step() {
		return this.cell.getAttribute("step");
	}
}

if (!customElements.get('cell-input-date')) {
	customElements.define("cell-input-date", CellInputDate);
}