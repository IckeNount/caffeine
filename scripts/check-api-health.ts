import { join } from "path";
import { config } from "dotenv";

config({ path: join(process.cwd(), ".env.local"), quiet: true });

async function main(): Promise<void> {
  const { checkApiHealth } = await import(
    "../src/shared/lib/health/check-api-health"
  );
  const report = await checkApiHealth();
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== "healthy") process.exitCode = 1;
}

main().catch(() => {
  console.error("health:api failed before a safe report could be generated");
  process.exitCode = 1;
});
