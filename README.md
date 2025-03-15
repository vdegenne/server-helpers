## checkFields

```ts
import {
	checkFields,
	FieldCheckStrategy,
} from '@vdegenne/server-helpers/checkFields.js';

const allFields = ['name', 'age', 'city']; // e.g. a person

router.post('/api/person', (ctx) => {
	const fields = checkFields(ctx, allFields, FieldCheckStrategy.ALL_REQUIRED);
	// If the check fails it auto stops (400)

	// do something with fields (filtered body)
});

router.put('/api/person/:personId', (ctx) => {
	const fields = checkFields(ctx, allFields, FieldCheckStrategy.AT_LEAST_ONE);
	// If the check fails it auto stops (400)

	// do something with fields (filtered body)
});
```
