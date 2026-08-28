export interface DailyReadingSource {
  title: string;
  url: string;
  extract: string;
}

export const DAILY_READING_TOPICS = [
  "Weather",
  "Photosynthesis",
  "Cloud",
  "Dog",
  "Dolphin",
  "Elephant",
  "Coral reef",
  "Recycling",
  "Bicycle",
  "Internet",
  "Electricity",
  "Association football",
  "Music",
  "Tree",
  "Moon",
  "Earth",
  "Cat",
  "Penguin",
  "Butterfly",
  "Book",
  "Map",
  "Library",
  "Mountain",
  "Computer",
  "Ocean",
] as const;

export function getTopicForDate(date: Date): string {
  const utcDay = Math.floor(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    ) / 86_400_000,
  );
  const index = ((utcDay % DAILY_READING_TOPICS.length) + DAILY_READING_TOPICS.length) % DAILY_READING_TOPICS.length;
  return DAILY_READING_TOPICS[index];
}

interface MediaWikiResponse {
  query?: {
    pages?: Array<{
      title?: string;
      canonicalurl?: string;
      extract?: string;
      missing?: boolean;
    }>;
  };
}

export async function fetchDailyReadingSource(
  date: Date = new Date(),
): Promise<DailyReadingSource> {
  const parameters = new URLSearchParams({
    action: "query",
    prop: "extracts|info",
    titles: getTopicForDate(date),
    exintro: "1",
    explaintext: "1",
    inprop: "url",
    redirects: "1",
    format: "json",
    formatversion: "2",
  });
  const response = await fetch(
    `https://simple.wikipedia.org/w/api.php?${parameters.toString()}`,
    {
      headers: {
        "Api-User-Agent": "Caffeine/0.1 (English-learning application)",
      },
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    throw new Error(`MediaWiki returned HTTP ${response.status}`);
  }

  const payload = (await response.json()) as MediaWikiResponse;
  const page = payload.query?.pages?.[0];
  const extract = page?.extract?.replace(/\s+/g, " ").trim();
  if (
    !page ||
    page.missing ||
    !page.title ||
    !page.canonicalurl ||
    !extract ||
    extract.length < 200
  ) {
    throw new Error("MediaWiki returned an incomplete learner source");
  }

  return {
    title: page.title,
    url: page.canonicalurl,
    extract: extract.slice(0, 6_000),
  };
}
