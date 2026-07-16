import { z } from "zod";

export const nonEmptyTrimmedStringSchema = z.string().trim().min(1);

export const isoDateTimeSchema = z.string().datetime({ offset: true });

export const scalarValueSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
]);

export type ScalarValue = z.infer<typeof scalarValueSchema>;
