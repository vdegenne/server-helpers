import {JSONDataFile, type SaveOptions} from './JSONDataFile.js';

interface ChangeOptions extends SaveOptions {
	/**
	 * Replace in-common properties but keep existing unchanged ones.
	 *
	 * @default false
	 */
	merge: boolean;

	/**
	 * When using `merge`, force unexisting properties to be inserted.
	 *
	 * @default false
	 */
	force: boolean;
}

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

	async change(id: number, newData: any, options?: Partial<ChangeOptions>) {
		const _options: ChangeOptions = {
			save: this._options.save,
			force: false,
			merge: false,
			...(options ?? {}),
		};
		if (!this._data) return;

		const index = this._data.findIndex((i) => i.id === id);
		if (index === -1) return;

		const currentItem = this._data[index];

		if (_options.merge) {
			// Only update existing keys unless `force` is true
			for (const key of Object.keys(newData)) {
				if (_options.force || key in currentItem) {
					(currentItem as any)[key] = newData[key];
				}
			}
		} else {
			this._data[index] = {...newData, id}; // Replace all, but preserve id
		}

		if (_options.save) {
			await this._save();
		}
	}

	async push(item: T, options?: Partial<SaveOptions>) {
		const _options: SaveOptions = {
			save: this._options.save,
			...(options ?? {}),
		};

		if (!this._data) {
			this._data = [];
		}

		this._data.push(item);
		this.ensureIds();

		if (_options.save) {
			await this._save();
		}

		return item;
	}

	async removeItem(id: number, options?: Partial<SaveOptions>) {
		const _options: SaveOptions = {
			save: this._options.save,
			...(options ?? {}),
		};

		if (!this._data) return;

		this._data = this._data.filter((item) => item.id !== id);

		if (_options.save) {
			await this._save();
		}
	}

	getItemFromId(id: number) {
		return (this._data ?? []).find((i) => i.id === id);
	}

	itemExistsFromId(id: number) {
		return !!this.getItemFromId(id);
	}
}
