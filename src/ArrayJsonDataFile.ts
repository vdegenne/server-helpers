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

export class ArrayJsonDataFile<T = any> extends JSONDataFile<T[]> {
	constructor(
		protected filepath: string,
		options?: Partial<DataFileOptions<T[]>>,
	) {
		super(filepath, {initialData: [], ...options});
	}

	/** alias of getData() */
	getItems(cache = this._options.cache, clone = false) {
		return this.getData(cache, clone);
	}

	async exists(item: T) {
		return (await this.itemIndex(item)) >= 0;
	}

	async itemIndex(item: T) {
		return ((await this.getData()) ?? []).indexOf(item);
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

		this._options.logger?.log('Pushing item');
		this._data.push(item);

		if (_options.save) {
			await this.save();
		}

		return item;
	}

	async replaceOrPush(item: T, options?: Partial<SaveOptions>) {
		const _options: SaveOptions = {
			save: this._options.save,
			...options,
		};

		const index = await this.itemIndex(item);

		if (index === -1) {
			if (this._data === undefined) {
				this._data = [];
			}
			this._options.logger?.log('Pushing item');
			this._data.push(item);
		} else {
			this._options.logger?.log('Replacing item');
			this._data![index] = item;
		}

		if (_options.save) {
			await this.save();
		}

		return item;
	}

	async deleteItem(item: T, options?: Partial<SaveOptions>) {
		const _options: SaveOptions = {
			save: this._options.save,
			...options,
		};

		const index = await this.itemIndex(item);
		if (index === -1) {
			return;
		}

		this._options.logger?.log('Deleting item');
		this._data!.splice(index, 1);

		if (_options.save) {
			// TODO: probably should remove await and make an external save promise
			await this.save();
		}
	}
}
