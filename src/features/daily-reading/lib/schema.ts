import { z } from "zod";

const normalizeText = (value: string) => value.replace(/\s+/g, " ").trim();
const wordCount = (value: string) => normalizeText(value).split(" ").length;

export const DailyReadingAdaptationSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    paragraph: z.string().trim().min(1).max(1_000),
    sentences: z.array(z.string().trim().min(1).max(500)).min(3).max(4),
  })
  .strict()
  .superRefine((value, context) => {
    const words = wordCount(value.paragraph);
    if (words < 60 || words > 100) {
      context.addIssue({
        code: "custom",
        path: ["paragraph"],
        message: "Daily reading must contain 60–100 words.",
      });
    }

    if (
      normalizeText(value.sentences.join(" ")) !==
      normalizeText(value.paragraph)
    ) {
      context.addIssue({
        code: "custom",
        path: ["sentences"],
        message: "Sentences must reproduce the paragraph exactly.",
      });
    }
  });

export const DailyReadingSchema = DailyReadingAdaptationSchema.extend({
  generatedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z
    .object({
      title: z.string().trim().min(1),
      url: z.string().url(),
      licenseName: z.literal("CC BY-SA 4.0"),
      licenseUrl: z.literal(
        "https://creativecommons.org/licenses/by-sa/4.0/",
      ),
    })
    .strict(),
  adaptationNotice: z.literal(
    "Adapted and simplified from Simple English Wikipedia; changes were made.",
  ),
}).strict();

export type DailyReadingAdaptation = z.infer<
  typeof DailyReadingAdaptationSchema
>;
export type DailyReading = z.infer<typeof DailyReadingSchema>;
