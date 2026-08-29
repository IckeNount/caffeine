import assert from "node:assert/strict";
import path from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { OcrResultSchema } from "../src/shared/lib/ocr/ocr-schema";

function stringEnvironment(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] =>
      typeof entry[1] === "string",
    ),
  );
}

async function main() {
  const fixtureRoot = path.join(process.cwd(), "tests/fixtures/ocr");
  const fixturePath = path.join(fixtureRoot, "clean-english.png");
  const client = new Client({ name: "caffeine-ocr-contract", version: "1.0.0" });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(process.cwd(), "node_modules/tsx/dist/cli.mjs"), "src/mcp/ocr-server.ts"],
    cwd: process.cwd(),
    env: {
      ...stringEnvironment(),
      OCR_MCP_ALLOWED_ROOT: fixtureRoot,
      OCR_CLOUD_ENABLED: "false",
    },
    stderr: "pipe",
  });

  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((tool) => tool.name), ["ocr_extract_text"]);

    const result = await client.callTool({
      name: "ocr_extract_text",
      arguments: { imagePath: fixturePath },
    });
    assert.notEqual(result.isError, true);
    const structured = OcrResultSchema.parse(result.structuredContent);
    assert.match(structured.text, /Caffeine helps learners read English/i);
    assert.equal(structured.provider, "tesseract");

    const traversal = await client.callTool({
      name: "ocr_extract_text",
      arguments: { imagePath: "../../../package.json" },
    });
    assert.equal(traversal.isError, true);

    const missingConsent = await client.callTool({
      name: "ocr_extract_text",
      arguments: { imagePath: fixturePath, provider: "gemini" },
    });
    assert.equal(missingConsent.isError, true);

    console.log("check:mcp:ocr OK");
  } finally {
    await client.close();
  }
}

void main();
