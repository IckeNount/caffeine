import { middlewareEnvSchema } from "./schema";

export const middlewareEnv = middlewareEnvSchema.parse(process.env);
