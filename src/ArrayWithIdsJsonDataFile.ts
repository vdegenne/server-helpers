import {
	type DataFileOptions,
	JSONDataFile,
	type SaveOptions,
} from './JsonDataFile.js';

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

// TODO: rewrite code base on ArrayJsonDataFile.ts
export class ArrayWithIdsJSONDataFile<
	T extends {id?: number},
> extends JSONDataFile<T[]> {
	constructor(
		protected filepath: string,
		options?: Partial<DataFileOptions<T[]>>,
	) {
		super(filepath, {initialData: [], ...options});
	}

	async load() {
		const data = await super.load();
		this.ensureIds();
		return data;
	}

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
			...options,
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
			await this.save();
		}
	}

	async push(item: T, options?: Partial<SaveOptions>) {
		const _options: SaveOptions = {
			save: this._options.save,
			...options,
		};

		await this.loadComplete;

		if (this._data === undefined) {
			this._data = [];
		}

		this._data.push(item);
		this.ensureIds();

		if (_options.save) {
			await this.save();
		}

		return item;
	}

	async removeItem(id: number, options?: Partial<SaveOptions>) {
		const _options: SaveOptions = {
			save: this._options.save,
			...options,
		};

		if (!this._data) return;

		this._data = this._data.filter((item) => item.id !== id);

		if (_options.save) {
			await this.save();
		}
	}

	getItemFromId(id: number) {
		return (this._data ?? []).find((i) => i.id === id);
	}

	itemExistsFromId(id: number) {
		return !!this.getItemFromId(id);
	}
}
