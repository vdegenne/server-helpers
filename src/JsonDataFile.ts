import {Debouncer} from '@vdegenne/debouncer';
import {type Logger} from '@vdegenne/debug';
import fs from 'fs/promises';

export interface SaveOptions {
	/**
	 * By default data file objects automatically saves data to files when the data changes.
	 * Set this option to false to avoid that. You then have the responsibility to save them
	 * manually, either by using the `save()` method directly or by passing `{save: true}` option
	 * to the respective modification methods.
	 *
	 * @default true
	 */
	save: boolean;
}

export interface DataFileOptions<T = any> extends SaveOptions {
	/**
	 * When calling .save() multiple times in a short amount of time,
	 * the function only gets executed one time.
	 * This value defines the range.
	 *
	 * @default 500
	 */
	saveDebouncerTimeoutMs: number;

	/**
	 * by default missing files aren't automatically created, an error is thrown instead.
	 * set this option to `true` to create the file without exceptions.
	 *
	 * @default false
	 */
	createIfNotExist: boolean;

	/**
	 * By default, file data is loaded and cached, it only changes when you decide to save new data.
	 * You can pass `cache` set to false to the `getData` function to force reading file again
	 * (e.g. if it was changed from another program.)
	 * Or you can set this option to `false` to always get data from the file directly.
	 * The data will still be cached.
	 *
	 * @default true
	 */
	cache: boolean;

	/**
	 * Whether or not the json data should be beautified when saved in the file.
	 *
	 * @default false
	 */
	beautifyJson: boolean;

	/**
	 * @default {}
	 */
	initialData: T;

	logger: Logger | undefined;
}

const DEFAULTS: DataFileOptions = {
	save: true,
	saveDebouncerTimeoutMs: 500,
	createIfNotExist: false,
	cache: true,
	beautifyJson: false,
	initialData: {},
	logger: undefined,
};

export class JSONDataFile<T = any> {
	protected _options: DataFileOptions<T>;
	protected _data: T | undefined;
	#saveDebouncer: Debouncer;

	protected _getData(): T {
		return this._data ?? this._options.initialData;
	}

	async getData(cache = this._options.cache, clone = false): Promise<T> {
		if (cache === false) {
			await this.load();
		}
		await this.loadComplete;
		const data = this._getData();
		if (clone && data !== undefined) {
			return JSON.parse(JSON.stringify(data));
		}
		return data;
	}

	constructor(
		protected filepath: string,
		options?: Partial<DataFileOptions<T>>,
	) {
		this._options = {
			...DEFAULTS,
			...options,
		};

		this.#saveDebouncer = new Debouncer(
			(data?: T) => this._save(data),
			this._options.saveDebouncerTimeoutMs,
		);

		this.load().catch(console.error);
	}

	loadComplete: Promise<T | undefined> = Promise.resolve(undefined);

	load() {
		this.loadComplete = new Promise(async (resolve) => {
			try {
				const fileContent = await fs.readFile(this.filepath, 'utf-8');
				this._data = JSON.parse(fileContent);
			} catch (err: any) {
				if (err.code === 'ENOENT' && this._options.createIfNotExist) {
					// File does not exist: create it with empty object
					this._data = this._options.initialData;
					await this._save(); // Save initial empty object
				} else {
					if (this._options.logger) {
						this._options.logger.error(`Failed to load file ${this.filepath}:`);
						this._options.logger.error(err);
					} else {
						console.error(`Failed to load file ${this.filepath}:`, err);
					}
					this._data = undefined;
				}
			} finally {
				resolve(this._data);
			}
		});
		return this.loadComplete;
	}

	protected async _save(data = this._getData()) {
		if (data === undefined) {
			return;
		}

		try {
			const json = this._options.beautifyJson
				? JSON.stringify(data, null, 2)
				: JSON.stringify(data);

			await fs.writeFile(this.filepath, json);
			this._data = data;
		} catch (err) {
			throw new Error(`Failed to save file ${this.filepath}: ${err}`);
		}
	}

	save(data?: T) {
		return this.#saveDebouncer.call(data);
	}
}
