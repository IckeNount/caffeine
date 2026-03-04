/**
 * Document chunker for the knowledge base.
 * Splits markdown documents into semantic chunks of ~300-500 tokens.
 */

export interface Chunk {
  content: string;
  index: number;
  metadata: {
    section?: string;
    heading?: string;
    source: string;
    category: string;
  };
}

/**
 * Split a markdown document into semantic chunks.
 * Strategy:
 * 1. Split by H2 headers (##) first — these are natural topic boundaries.
 * 2. If a section is too long (>600 words), split by paragraphs.
 * 3. Each chunk includes its heading context for better retrieval.
 */
export function chunkDocument(
  content: string,
  source: string,
  category: string
): Chunk[] {
  const chunks: Chunk[] = [];
  const lines = content.split("\n");

  let currentSection = "";
  let currentHeading = "";
  let buffer: string[] = [];
  let chunkIndex = 0;

  const flushBuffer = () => {
    const text = buffer.join("\n").trim();
    if (text.length > 50) {
      // Only create chunks with meaningful content
      const chunkContent = currentHeading
        ? `## ${currentHeading}\n\n${text}`
        : text;

      // If chunk is too large, split by paragraphs
      if (chunkContent.split(/\s+/).length > 600) {
        const paragraphs = chunkContent.split("\n\n");
        let subBuffer = "";

        for (const para of paragraphs) {
          if ((subBuffer + "\n\n" + para).split(/\s+/).length > 400 && subBuffer.length > 50) {
            chunks.push({
              content: subBuffer.trim(),
              index: chunkIndex++,
              metadata: {
                section: currentSection,
                heading: currentHeading,
                source,
                category,
              },
            });
            subBuffer = para;
          } else {
            subBuffer = subBuffer ? subBuffer + "\n\n" + para : para;
          }
        }

        if (subBuffer.trim().length > 50) {
          chunks.push({
            content: subBuffer.trim(),
            index: chunkIndex++,
            metadata: {
              section: currentSection,
              heading: currentHeading,
              source,
              category,
            },
          });
        }
      } else {
        chunks.push({
          content: chunkContent,
          index: chunkIndex++,
          metadata: {
            section: currentSection,
            heading: currentHeading,
            source,
            category,
          },
        });
      }
    }
    buffer = [];
  };

  for (const line of lines) {
    // H1 = document title / section
    if (line.startsWith("# ") && !line.startsWith("## ")) {
      currentSection = line.replace("# ", "").trim();
      continue;
    }

    // H2 = new chunk boundary
    if (line.startsWith("## ")) {
      flushBuffer();
      currentHeading = line.replace("## ", "").trim();
      continue;
    }

    buffer.push(line);
  }

  // Flush remaining content
  flushBuffer();

  return chunks;
}
