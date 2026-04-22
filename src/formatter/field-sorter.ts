const FIELD_ORDER = [
  "schema_version",
  "id",
  "slug",
  "title",
  "title_ja",
  "authors",
  "isbn_13",
  "publication_year",
  "language",
  "genre",
  "status",
  "read_sessions",
  "rating",
  "tags",
  "summary",
  "key_concepts",
  "highlights",
  "action_items",
  "connections",
  "open_questions",
  "ai_generated",
];

export function sortFields(obj: Record<string, unknown>): Record<string, unknown> {
  const sorted: Record<string, unknown> = {};
  for (const key of FIELD_ORDER) {
    if (key in obj) {
      sorted[key] = obj[key];
    }
  }
  for (const key of Object.keys(obj)) {
    if (!(key in sorted)) {
      sorted[key] = obj[key];
    }
  }
  return sorted;
}
