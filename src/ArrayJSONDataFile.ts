import {JSONDataFile} from './JSONDataFile.js';

export class ArrayJSONDataFile<T extends {id?: number}> extends JSONDataFile<
	T[]
> {
	async load() {
		const data = await super.load();
		this.ensureIds();
		return data;
	}

	// getData(clone = false) {
	// 	const data = super.getData(clone);
	// 	return data ?? [];
	// }

	getNextId(): number {
		if (!this._data || this._data.length === 0) return 0;
		return Math.max(...this._data.map((item) => item.id ?? -1)) + 1;
	}

	ensureIds() {
		if (!this._data) return;
		let nextId = this.getNextId();
		for (const item of this._data) {
			if (item.id === undefined) {
				item.id = nextId++;
			}
		}
	}

	async change(id: number, newData: any, options?: {save: boolean}) {
		if (!this._data) return;
		const index = this._data.findIndex((i) => i.id === id);
		if (index >= 0) {
			this._data[index] = newData;
			this._data[index].id = id; // Just making sure the id is persisted
			if (options && options.save === true) {
				await this._save();
			}
		}
	}

	push(item: T) {
		if (!this._data) {
			this._data = [];
		}

		this._data.push(item);
		this.ensureIds();

		this.save();

		return item;
	}

	removeItem(id: number) {
		if (!this._data) return;

		this._data = this._data.filter((item) => item.id !== id);
		this.save();
	}

	getItemFromId(id: number) {
		return (this._data ?? []).find((i) => i.id === id);
	}

	itemExistsFromId(id: number) {
		return !!this.getItemFromId(id);
	}
}
