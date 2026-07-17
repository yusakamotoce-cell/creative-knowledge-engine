import { z } from "zod";

import { isoDateTimeSchema, nonEmptyTrimmedStringSchema } from "../shared/schemas.js";
import { sourceRefSchema } from "../shared/sourceRef.js";
import { attributeRecordSchema } from "./attributeRecord.js";

export const entityTypeSchema = z.enum([
  "character",
  "scene",
  "location",
  "item",
  "organization",
]);

export type EntityType = z.infer<typeof entityTypeSchema>;

export const entitySchema = z.strictObject({
  id: nonEmptyTrimmedStringSchema,
  entityType: entityTypeSchema,
  name: nonEmptyTrimmedStringSchema,
  aliases: z.array(nonEmptyTrimmedStringSchema),
  description: z.string(),
  attributes: z.record(z.string(), attributeRecordSchema),
  tags: z.array(z.string()),
  sourceRefs: z.array(sourceRefSchema),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export type Entity = z.infer<typeof entitySchema>;
