/**
 * Enum to define the strategies for field validation.
 */
export enum FieldCheckStrategy {
	ALL_REQUIRED = 'allRequired',
	AT_LEAST_ONE = 'atLeastOne',
}

/**
 * A helper function to filter and validate the fields in the request body.
 * @param ctx - The Koa context.
 * @param allFields - A list of field names (keys) to check in the body.
 * @param strategy - The field check strategy to apply.
 * @returns The filtered body, containing only the allowed fields.
 */
export function checkFields<T extends object>(
	ctx: any,
	allFields: (keyof T)[],
	strategy: FieldCheckStrategy.ALL_REQUIRED,
): T;

export function checkFields<T extends object>(
	ctx: any,
	allFields: (keyof T)[],
	strategy: FieldCheckStrategy.AT_LEAST_ONE,
): Partial<T>;

export function checkFields<T extends object>(
	ctx: any,
	allFields: (keyof T)[],
	strategy: FieldCheckStrategy,
): T | Partial<T> {
	const body = ctx.request.body;

	// Filter out alien properties from body
	const filteredBody = Object.keys(body)
		.filter((key) => allFields.includes(key as keyof T)) // Type-safe filtering
		.reduce<{[K in keyof T]?: T[K]}>((obj, key) => {
			obj[key as keyof T] = body[key as keyof T];
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

	ctx.state.body = filteredBody;

	return filteredBody as any; // Return the filtered body with the correct type
}
