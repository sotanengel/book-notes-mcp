import { z } from "zod";

const bookIdSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*-[a-z]+-[0-9]{4}$/, "Invalid book id format");

const querySchema = z.string().min(1).max(500).trim();
const limitSchema = z.number().int().min(1).max(100).default(20);
const offsetSchema = z.number().int().min(0).default(0);

export const ListBooksInput = z.object({
  status: z
    .enum(["to-read", "reading", "completed", "abandoned", "reference"])
    .optional(),
  genre: z.string().max(50).optional(),
  language: z.enum(["ja", "en", "zh", "de", "fr", "es", "ko", "other"]).optional(),
  tag: z.string().max(50).optional(),
  limit: limitSchema,
  offset: offsetSchema,
});

export const GetBookInput = z.object({
  id: bookIdSchema,
});

export const SearchBooksInput = z.object({
  query: querySchema,
  limit: limitSchema,
  offset: offsetSchema,
});

export const SearchHighlightsInput = z.object({
  query: querySchema,
  book_id: bookIdSchema.optional(),
  limit: limitSchema,
});

export const SearchConceptsInput = z.object({
  query: querySchema,
  limit: limitSchema,
});

export const FindConnectionsInput = z.object({
  book_id: bookIdSchema,
  depth: z.union([z.literal(1), z.literal(2)]).default(1),
});

export const GetActionableInsightsInput = z.object({
  book_id: bookIdSchema.optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  status: z.enum(["pending", "in-progress", "done", "skipped"]).optional(),
  limit: limitSchema,
});
