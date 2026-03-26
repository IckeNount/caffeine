import { publicEnvSchema } from "./schema";

export const publicEnv = publicEnvSchema.parse(process.env);
