import { z } from "zod";

import { entitySchema } from "../entities/entity";
import { relationshipSchema } from "../relationships/relationship";

export const knowledgeStateSchema = z.strictObject({
  entities: z.array(entitySchema),
  relationships: z.array(relationshipSchema),
});

export type KnowledgeState = z.infer<typeof knowledgeStateSchema>;
