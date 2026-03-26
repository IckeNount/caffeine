/**
 * Validates required + optional env keys against src/env/schema.ts (same as server boot).
 * Run in CI with placeholder values so builds match production variable *names*.
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { serverEnvSchema } from "../src/env/schema";

const cwd = process.cwd();

function declaredKeysFromExample(filePath: string): Set<string> {
  const example = readFileSync(filePath, "utf8");
  const declared = new Set<string>();
  for (const line of example.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq > 0) declared.add(t.slice(0, eq).trim());
  }
  return declared;
}

const examplePath = join(cwd, ".env.example");
const prodExamplePath = join(cwd, ".env.production.example");

if (!existsSync(prodExamplePath)) {
  console.error(
    "check:env: .env.production.example is missing (keep it in sync with the server env contract).",
  );
  process.exit(1);
}

const declaredInExample = declaredKeysFromExample(examplePath);
const declaredInProdExample = declaredKeysFromExample(prodExamplePath);

const shape = serverEnvSchema.shape;
for (const key of Object.keys(shape) as (keyof typeof shape)[]) {
  const isOptional = shape[key].isOptional();
  if (!isOptional && !declaredInExample.has(key)) {
    console.error(
      `check:env: required key "${key}" is missing from .env.example (must document contract).`,
    );
    process.exit(1);
  }
  if (!isOptional && !declaredInProdExample.has(key)) {
    console.error(
      `check:env: required key "${key}" is missing from .env.production.example (must document production contract).`,
    );
    process.exit(1);
  }
}

serverEnvSchema.parse(process.env);
console.log("check:env OK");
