import {Debouncer} from '@vdegenne/debouncer';
import fs from 'fs/promises';

interface DataFileOptions {
	/**
	 * When calling .save() multiple times in a short amount of time,
	 * the function only gets executed one time.
	 * This value defines the range.
	 *
	 * @default 500
	 */
	saveDebouncerTimeoutMs: number;

	/**
	 * By default missing files are not automatically created but an error is thrown instead.
	 * Set this option to `true` to create the file without exceptions.
	 *
	 * @default false
	 */
	force: boolean;

	/**
	 * Whether or not the json data should be beautified when saved in the file.
	 * @default false
	 */
	beautifyJson: boolean;

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
}

export class JSONDataFile<T = any> {
	#options: DataFileOptions;
	protected _data: T | undefined;
	#saveDebouncer: Debouncer;

	async getData(
		cache = this.#options.cache,
		clone = false,
	): Promise<T | undefined> {
		if (cache === false) {
			await this.load();
		}
		if (clone && this._data !== undefined) {
			return JSON.parse(JSON.stringify(this._data));
		}
		return this._data;
	}

	constructor(
		private filepath: string,
		options?: Partial<DataFileOptions>,
	) {
		this.#options = {
			saveDebouncerTimeoutMs: 500, //
			force: false,
			beautifyJson: false,
			cache: true,
			...options,
		};

		this.#saveDebouncer = new Debouncer(
			(...args) => this.#save(...args),
			this.#options.saveDebouncerTimeoutMs,
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
				if (err.code === 'ENOENT' && this.#options.force) {
					// File does not exist: create it with empty object
					this._data = {} as T;
					await this.#save(); // Save initial empty object
				} else {
					console.error(`Failed to load file ${this.filepath}:`, err);
					this._data = undefined;
				}
			} finally {
				resolve(this._data);
			}
		});
		return this.loadComplete;
	}

	async #save(data = this._data) {
		// const data = data ?? this._data;
		if (data === undefined) return;

		try {
			const json = this.#options.beautifyJson
				? JSON.stringify(data, null, 2)
				: JSON.stringify(data);

			await fs.writeFile(this.filepath, json);
			this._data = data;
		} catch (err) {
			console.error(`Failed to save file ${this.filepath}:`, err);
		}
	}

	save(data?: T) {
		this.#saveDebouncer.call(data);
	}
}
