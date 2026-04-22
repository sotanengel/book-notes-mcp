/**
 * OpenBD (https://openbd.jp) — Japanese ISBN lookup, no auth required.
 * Google Books — international fallback, no auth required.
 */

export interface BookMetadata {
  title?: string;
  titleJa?: string;
  authors?: string[];
  isbn13?: string;
  publicationYear?: number;
  publisher?: string;
  language?: string;
}

export async function fetchByIsbn(isbn13: string): Promise<BookMetadata | null> {
  // 1. Try OpenBD first (best for Japanese books)
  const openbd = await fetchOpenBD(isbn13);
  if (openbd) return openbd;

  // 2. Fall back to Google Books
  return fetchGoogleBooks(isbn13);
}

async function fetchOpenBD(isbn13: string): Promise<BookMetadata | null> {
  try {
    const url = `https://api.openbd.jp/v1/get?isbn=${isbn13}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const data = (await res.json()) as Array<{
      summary?: {
        isbn?: string;
        title?: string;
        author?: string;
        pubdate?: string;
        publisher?: string;
      };
    } | null>;

    const item = data[0];
    if (!item?.summary) return null;

    const s = item.summary;
    const year = s.pubdate ? Number.parseInt(s.pubdate.slice(0, 4), 10) : undefined;

    const meta: BookMetadata = { isbn13, language: "ja" };
    if (s.title) meta.title = s.title;
    if (s.author) meta.authors = [s.author];
    if (s.publisher) meta.publisher = s.publisher;
    const validYear = year !== undefined && !Number.isNaN(year) ? year : undefined;
    if (validYear !== undefined) meta.publicationYear = validYear;
    return meta;
  } catch {
    return null;
  }
}

async function fetchGoogleBooks(isbn13: string): Promise<BookMetadata | null> {
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn13}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      totalItems?: number;
      items?: Array<{
        volumeInfo?: {
          title?: string;
          authors?: string[];
          publishedDate?: string;
          publisher?: string;
          language?: string;
          industryIdentifiers?: Array<{ type: string; identifier: string }>;
        };
      }>;
    };

    if (!data.totalItems || !data.items?.[0]?.volumeInfo) return null;

    const info = data.items[0].volumeInfo;
    const yearStr = info.publishedDate?.slice(0, 4);
    const year = yearStr ? Number.parseInt(yearStr, 10) : undefined;

    const meta: BookMetadata = { isbn13 };
    if (info.title) meta.title = info.title;
    if (info.authors) meta.authors = info.authors;
    if (info.publisher) meta.publisher = info.publisher;
    if (info.language) meta.language = info.language;
    const validYear = year !== undefined && !Number.isNaN(year) ? year : undefined;
    if (validYear !== undefined) meta.publicationYear = validYear;
    return meta;
  } catch {
    return null;
  }
}
