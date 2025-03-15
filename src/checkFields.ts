class FieldValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'FieldValidationError';
	}
}

/**
 * Enum to define the strategies for field validation.
 */
export enum FieldCheckStrategy {
	/**
	 * All fields from `allFields` must be present in the body.
	 * If any are missing, an error will be thrown.
	 */
	ALL_REQUIRED = 'allRequired',

	/**
	 * At least one field from `allFields` must be present in the body.
	 * If none are provided, an error will be thrown.
	 */
	AT_LEAST_ONE = 'atLeastOne',
}

export function checkFields(
	ctx: any,
	allFields: string[],
	strategy: FieldCheckStrategy,
) {
	const body = ctx.request.body;

	// Filter out alien properties
	const filteredBody = Object.keys(body)
		.filter((key) => allFields.includes(key))
		.reduce<{[key: string]: any}>((obj, key) => {
			obj[key] = body[key];
			return obj;
		}, {});

	// Strategy enforcement
	if (strategy === FieldCheckStrategy.ALL_REQUIRED) {
		const missingFields = allFields.filter((field) => !(field in filteredBody));
		if (missingFields.length > 0) {
			ctx.throw(400, `Missing required fields: ${missingFields.join(', ')}`);
		}
	} else if (strategy === FieldCheckStrategy.AT_LEAST_ONE) {
		const hasAtLeastOneField = allFields.some((field) => field in filteredBody);
		if (!hasAtLeastOneField) {
			ctx.throw(
				400,
				`At least one of the following fields must be provided: ${allFields.join(', ')}`,
			);
		}
	}

	// Store the filtered body in ctx.state.body
	ctx.state.body = filteredBody;

	return filteredBody;
}
