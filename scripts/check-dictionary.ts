import assert from "node:assert/strict";
import { lookupDictionary } from "../src/features/dictionary/lib/lookup";
import { normalizeDictionaryWord } from "../src/features/dictionary/lib/schema";

assert.equal(normalizeDictionaryWord(" Student "), "student");
assert.equal(normalizeDictionaryWord("can't"), "can't");
assert.equal(normalizeDictionaryWord("two words"), null);
assert.equal(normalizeDictionaryWord("123"), null);

const fullFetch: typeof fetch = async (input) => {
  const url = String(input);
  if (url.includes("mymemory")) {
    return Response.json({
      responseStatus: 200,
      responseData: { translatedText: "นักเรียน" },
    });
  }

  return Response.json([
    {
      word: "student",
      phonetic: "/ˈstjuːdnt/",
      phonetics: [{ audio: "https://example.com/student.mp3" }],
      meanings: [
        {
          partOfSpeech: "noun",
          definitions: [
            {
              definition: "A person who is learning at a school.",
              example: "The student reads every day.",
            },
          ],
        },
      ],
    },
  ]);
};

async function main() {
  const full = await lookupDictionary("student", fullFetch);
  assert.equal(full.thaiMeaning, "นักเรียน");
  assert.equal(full.partOfSpeech, "noun");
  assert.equal(full.definition, "A person who is learning at a school.");
  assert.equal(full.partial, false);

  const partial = await lookupDictionary("student", async (input) =>
    String(input).includes("mymemory")
      ? Response.json({
          responseStatus: 200,
          responseData: { translatedText: "นักเรียน" },
        })
      : new Response("unavailable", { status: 522 }),
  );
  assert.equal(partial.thaiMeaning, "นักเรียน");
  assert.equal(partial.definition, null);
  assert.equal(partial.partial, true);

  console.log("check:dictionary OK");
}

void main();
