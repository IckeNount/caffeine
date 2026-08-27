/**
 * Lists App Router route handlers, validates infra/nginx.conf for /api coverage,
 * and diffs `src/app/api/**` namespaces against infra/gateway-routes.yaml.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

const cwd = process.cwd();
const appRoot = join(cwd, "src", "app");
const nginxPath = join(cwd, "infra", "nginx.conf");
const gatewayPath = join(cwd, "infra", "gateway-routes.yaml");

function collectRouteDirs(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (!statSync(p).isDirectory()) continue;
    const routeFile = join(p, "route.ts");
    if (existsSync(routeFile)) {
      out.push(p);
    }
    out.push(...collectRouteDirs(p));
  }
  return out;
}

function toUrlPath(routeDir: string): string {
  const rel = relative(appRoot, routeDir);
  if (!rel || rel.startsWith("..")) {
    throw new Error(`Unexpected route dir outside app: ${routeDir}`);
  }
  const segments = rel.split(/[/\\]/);
  return `/${segments.join("/")}`;
}

/** Next.js dynamic segment like [id] */
function isDynamicSegment(seg: string): boolean {
  return /^\[[^\]]+\]$/.test(seg);
}

/**
 * API namespace used for the gateway registry.
 * Returns `/api/<firstStaticSegment>` or `/api` when none exists.
 */
function apiNamespace(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "api") {
    throw new Error(`apiNamespace expected /api/*, got ${pathname}`);
  }
  if (parts.length === 1) {
    return "/api";
  }
  const second = parts[1];
  if (isDynamicSegment(second)) {
    return "/api";
  }
  return `/api/${second}`;
}

function parseGatewayPrefixes(fileContent: string): string[] {
  const paths: string[] = [];
  for (const line of fileContent.split("\n")) {
    const t = line.trim();
    const pathMatch = t.match(/^-\s*path:\s+(.+)$/);
    if (!pathMatch) continue;
    const rest = pathMatch[1].trim();
    if (!rest) continue;
    if (rest.startsWith('"') || rest.startsWith("'")) {
      const q = rest[0];
      const end = rest.indexOf(q, 1);
      if (end > 0) paths.push(rest.slice(1, end));
      continue;
    }
    const path = rest.split(/\s+#/)[0].trim();
    paths.push(path);
  }
  return paths;
}

/** True if gateway row `d` covers API namespace `ns` (segment-aligned). */
function gatewayCoversNamespace(d: string, ns: string): boolean {
  return ns === d || ns.startsWith(d + "/");
}

const routeDirs = collectRouteDirs(appRoot).sort();
const paths = routeDirs.map(toUrlPath);

console.log(`Discovered ${paths.length} route handlers:`);
for (const p of paths) console.log(`  ${p}`);

if (existsSync(nginxPath)) {
  const nginx = readFileSync(nginxPath, "utf8");
  const coversApi =
    /\blocation\s+[\^~]*\s*\/api\/?\b/m.test(nginx) ||
    /\blocation\s+[\^~]*\s*\/api\//m.test(nginx);
  if (!coversApi) {
    console.error(
      "infra/nginx.conf exists but has no `location /api` (or /api/) block — gateway may drop API traffic.",
    );
    process.exit(1);
  }
  console.log("infra/nginx.conf: /api location present.");
}

const apiPaths = paths.filter((p) => p === "/api" || p.startsWith("/api/"));

if (existsSync(gatewayPath)) {
  const gatewayRaw = readFileSync(gatewayPath, "utf8");
  const declared = parseGatewayPrefixes(gatewayRaw);
  if (declared.length === 0) {
    console.error(
      "infra/gateway-routes.yaml has no `path:` entries under prefixes — add documented API prefixes.",
    );
    process.exit(1);
  }

  const required = new Set<string>();
  for (const p of apiPaths) {
    required.add(apiNamespace(p));
  }

  for (const ns of required) {
    const found = declared.some((d) => gatewayCoversNamespace(d, ns));
    if (!found) {
      console.error(
        `Gateway registry missing coverage for API namespace "${ns}" (from App routes). Declared: ${declared.join(", ")}`,
      );
      process.exit(1);
    }
  }

  for (const d of declared) {
    if (!d.startsWith("/api")) continue;
    const hasRoute = apiPaths.some((p) => p === d || p.startsWith(d + "/"));
    if (!hasRoute) {
      console.error(
        `infra/gateway-routes.yaml lists prefix "${d}" but no matching route.ts under src/app.`,
      );
      process.exit(1);
    }
  }

  console.log(
    `infra/gateway-routes.yaml: ${declared.length} prefix(es) OK vs ${apiPaths.length} API route handler(s).`,
  );
} else {
  console.warn(
    "infra/gateway-routes.yaml missing — skipping gateway prefix diff (add file for CI drift checks).",
  );
}

console.log("check:routes OK");
