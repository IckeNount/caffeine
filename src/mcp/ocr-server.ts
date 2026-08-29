import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createOcrMcpServer } from "./ocr-tool";

serveStdio(() => createOcrMcpServer());
