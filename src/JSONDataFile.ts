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
}

export class JSONDataFile<T = any> {
	#options: DataFileOptions;
	#data: T | undefined;
	#saveDebouncer: Debouncer;

	getData(clone = false) {
		if (clone && this.#data !== undefined) {
			return JSON.parse(JSON.stringify(this.#data));
		}
		return this.#data;
	}

	constructor(
		private filepath: string,
		options?: Partial<DataFileOptions>,
	) {
		this.#options = {saveDebouncerTimeoutMs: 500, ...options};

		this.#saveDebouncer = new Debouncer(
			(...args) => this.#save(...args),
			this.#options.saveDebouncerTimeoutMs,
		);

		this.load().catch(console.error); // Ensure file is loaded
	}

	loadComplete: Promise<T | undefined> = Promise.resolve(undefined);

	async load() {
		return (this.loadComplete = new Promise(async (resolve) => {
			try {
				const fileContent = await fs.readFile(this.filepath, 'utf-8');
				this.#data = JSON.parse(fileContent);
			} catch (err) {
				console.error(`Failed to load file ${this.filepath}:`, err);
				this.#data = undefined; // Handle missing or corrupt files
			} finally {
				resolve(this.#data);
			}
		}));
	}

	async #save(data?: T) {
		const newData = data ?? this.#data;
		if (newData === undefined) return;

		try {
			await fs.writeFile(this.filepath, JSON.stringify(newData, null, 2));
			this.#data = newData; // Update only after a successful save
		} catch (err) {
			console.error(`Failed to save file ${this.filepath}:`, err);
		}
	}

	save(data?: T) {
		this.#saveDebouncer.call(data);
	}
}
