import "server-only";

import { serverEnvSchema } from "./schema";

export const env = serverEnvSchema.parse(process.env);
