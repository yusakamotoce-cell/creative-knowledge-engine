import { z } from "zod";

import { isoDateTimeSchema, nonEmptyTrimmedStringSchema } from "../shared/schemas";
import { sourceRefSchema } from "../shared/sourceRef";

export const relationshipSchema = z.strictObject({
  id: nonEmptyTrimmedStringSchema,
  fromEntityId: nonEmptyTrimmedStringSchema,
  toEntityId: nonEmptyTrimmedStringSchema,
  relationType: nonEmptyTrimmedStringSchema,
  description: z.string(),
  sourceRefs: z.array(sourceRefSchema),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export type Relationship = z.infer<typeof relationshipSchema>;
