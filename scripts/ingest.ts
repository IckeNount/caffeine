/**
 * Knowledge Base Ingestion Script
 *
 * Reads all .md files from the knowledge-base/ directory,
 * chunks them, embeds each chunk using OpenAI, and uploads
 * everything to Supabase.
 *
 * Usage:
 *   npx tsx scripts/ingest.ts
 *
 * Requires these env vars (in .env.local):
 *   OPENAI_API_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// ── Load env vars from .env.local ───────────────────────────────────
import * as dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_KEY) {
  console.error("❌ Missing required environment variables.");
  console.error("   Ensure .env.local has: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_KEY });

// ── Chunker (inline for script independence) ────────────────────────

interface Chunk {
  content: string;
  index: number;
  metadata: { section?: string; heading?: string; source: string; category: string };
}

function chunkDocument(content: string, source: string, category: string): Chunk[] {
  const chunks: Chunk[] = [];
  const lines = content.split("\n");
  let currentSection = "";
  let currentHeading = "";
  let buffer: string[] = [];
  let chunkIndex = 0;

  const flushBuffer = () => {
    const text = buffer.join("\n").trim();
    if (text.length > 50) {
      const chunkContent = currentHeading ? `## ${currentHeading}\n\n${text}` : text;

      if (chunkContent.split(/\s+/).length > 600) {
        const paragraphs = chunkContent.split("\n\n");
        let subBuffer = "";
        for (const para of paragraphs) {
          if ((subBuffer + "\n\n" + para).split(/\s+/).length > 400 && subBuffer.length > 50) {
            chunks.push({ content: subBuffer.trim(), index: chunkIndex++, metadata: { section: currentSection, heading: currentHeading, source, category } });
            subBuffer = para;
          } else {
            subBuffer = subBuffer ? subBuffer + "\n\n" + para : para;
          }
        }
        if (subBuffer.trim().length > 50) {
          chunks.push({ content: subBuffer.trim(), index: chunkIndex++, metadata: { section: currentSection, heading: currentHeading, source, category } });
        }
      } else {
        chunks.push({ content: chunkContent, index: chunkIndex++, metadata: { section: currentSection, heading: currentHeading, source, category } });
      }
    }
    buffer = [];
  };

  for (const line of lines) {
    if (line.startsWith("# ") && !line.startsWith("## ")) {
      currentSection = line.replace("# ", "").trim();
      continue;
    }
    if (line.startsWith("## ")) {
      flushBuffer();
      currentHeading = line.replace("## ", "").trim();
      continue;
    }
    buffer.push(line);
  }
  flushBuffer();
  return chunks;
}

// ── Embed with rate limiting ────────────────────────────────────────

async function embedText(text: string, maxRetries = 3): Promise<number[]> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      });
      return result.data[0].embedding;
    } catch (err) {
      const isLastAttempt = attempt === maxRetries;
      const backoffMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s

      if (isLastAttempt) {
        throw err; // let the caller handle it after all retries exhausted
      }

      console.warn(`     ⚠️  Embed attempt ${attempt}/${maxRetries} failed, retrying in ${backoffMs / 1000}s...`);
      await sleep(backoffMs);
    }
  }

  // TypeScript: unreachable, but satisfies the compiler
  throw new Error("embedText: unexpected exit from retry loop");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Main ingestion logic ────────────────────────────────────────────

async function ingestDirectory(kbDir: string) {
  const categories = fs.readdirSync(kbDir).filter((f) =>
    fs.statSync(path.join(kbDir, f)).isDirectory()
  );

  console.log(`\n📚 Found categories: ${categories.join(", ")}\n`);

  let totalDocs = 0;
  let totalChunks = 0;

  for (const category of categories) {
    const catDir = path.join(kbDir, category);
    const files = fs.readdirSync(catDir).filter((f) => f.endsWith(".md"));

    console.log(`\n📁 Category: ${category} (${files.length} files)`);

    for (const file of files) {
      const filePath = path.join(catDir, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const checksum = crypto.createHash("md5").update(content).digest("hex");
      const title = content.split("\n")[0]?.replace(/^#+\s*/, "").trim() || file;

      // Check if document already exists with same checksum
      const { data: existing } = await supabase
        .from("kb_documents")
        .select("id, checksum")
        .eq("filename", file)
        .single();

      // Pre-chunk so we know the expected count
      const chunks = chunkDocument(content, file, category);

      if (existing?.checksum === checksum) {
        // Checksum matches — but verify all chunks are actually stored
        const { count: storedChunkCount } = await supabase
          .from("kb_chunks")
          .select("chunk_index", { count: "exact", head: true })
          .eq("document_id", existing.id);

        if (storedChunkCount === chunks.length) {
          console.log(`  ⏭️  ${file} (unchanged, skipping)`);
          continue;
        }

        // Some chunks are missing — find which ones and backfill
        const { data: storedChunks } = await supabase
          .from("kb_chunks")
          .select("chunk_index")
          .eq("document_id", existing.id);

        const storedIndices = new Set((storedChunks || []).map((c) => c.chunk_index));
        const missingChunks = chunks.filter((c) => !storedIndices.has(c.index));

        console.log(`  🔧 ${file} (${missingChunks.length} missing chunk(s), backfilling)`);

        for (const chunk of missingChunks) {
          try {
            const embedding = await embedText(chunk.content);

            const { error: chunkError } = await supabase.from("kb_chunks").insert({
              document_id: existing.id,
              chunk_index: chunk.index,
              content: chunk.content,
              metadata: chunk.metadata,
              embedding: JSON.stringify(embedding),
            });

            if (chunkError) {
              console.error(`     ❌ Chunk ${chunk.index} failed:`, chunkError);
            } else {
              console.log(`     ✅ Backfilled chunk ${chunk.index}`);
            }

            await sleep(100);
          } catch (err) {
            console.error(`     ❌ Embedding failed for chunk ${chunk.index}:`, err);
            await sleep(2000);
          }
        }

        totalChunks += missingChunks.length;
        continue;
      }

      // If document exists but changed, delete old chunks
      if (existing) {
        await supabase.from("kb_chunks").delete().eq("document_id", existing.id);
        await supabase.from("kb_documents").delete().eq("id", existing.id);
        console.log(`  🔄 ${file} (updated, re-ingesting)`);
      } else {
        console.log(`  ✨ ${file} (new)`);
      }

      // Insert document
      const { data: doc, error: docError } = await supabase
        .from("kb_documents")
        .insert({
          filename: file,
          category,
          title,
          content,
          checksum,
        })
        .select("id")
        .single();

      if (docError || !doc) {
        console.error(`  ❌ Failed to insert document ${file}:`, docError);
        continue;
      }

      console.log(`     → ${chunks.length} chunks`);

      // Embed and insert each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        try {
          const embedding = await embedText(chunk.content);

          const { error: chunkError } = await supabase.from("kb_chunks").insert({
            document_id: doc.id,
            chunk_index: chunk.index,
            content: chunk.content,
            metadata: chunk.metadata,
            embedding: JSON.stringify(embedding),
          });

          if (chunkError) {
            console.error(`     ❌ Chunk ${i} failed:`, chunkError);
          } else {
            process.stdout.write(`     ✅ Chunk ${i + 1}/${chunks.length}\r`);
          }

          // Rate limit: be safe with 100ms delay between embedding calls
          await sleep(100);
        } catch (err) {
          console.error(`     ❌ Embedding failed for chunk ${i}:`, err);
          // Wait longer on rate limit
          await sleep(2000);
        }
      }

      console.log(`     ✅ All ${chunks.length} chunks embedded and stored`);
      totalDocs++;
      totalChunks += chunks.length;
    }
  }

  console.log(`\n🎉 Ingestion complete!`);
  console.log(`   Documents: ${totalDocs}`);
  console.log(`   Chunks: ${totalChunks}`);
}

// ── Run ─────────────────────────────────────────────────────────────

const kbPath = path.resolve(__dirname, "../knowledge-base");

if (!fs.existsSync(kbPath)) {
  console.error(`❌ Knowledge base directory not found: ${kbPath}`);
  process.exit(1);
}

ingestDirectory(kbPath).catch((err) => {
  console.error("❌ Ingestion failed:", err);
  process.exit(1);
});
