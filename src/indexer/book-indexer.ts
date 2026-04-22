import { readFileSync } from "node:fs";
import { basename } from "node:path";
import Database from "better-sqlite3";
import { parse } from "yaml";

interface BookEntry {
  id: string;
  slug: string;
  title: string;
  title_ja?: string;
  authors: string[];
  isbn_13?: string;
  publication_year?: number;
  language?: string;
  genre?: string[];
  status: string;
  rating?: number;
  tags?: string[];
  summary?: string;
  key_concepts?: Array<{ name: string; description: string; related_to?: string[] }>;
  highlights?: Array<{
    id: string;
    page?: number;
    location?: string;
    text: string;
    note?: string;
    tags?: string[];
  }>;
  action_items?: Array<{
    id: string;
    action: string;
    priority: string;
    status?: string;
    deadline?: string;
  }>;
  connections?: Array<{ book_id: string; relation: string; note?: string }>;
}

export function indexBookFile(db: Database.Database, filePath: string): void {
  const rawYaml = readFileSync(filePath, "utf-8");
  const data = parse(rawYaml) as BookEntry;
  const now = new Date().toISOString();
  const fileName = basename(filePath);

  db.transaction(() => {
    // Upsert main book record
    db.prepare(`
      INSERT INTO books (id, file_path, title, title_ja, authors, isbn_13, pub_year,
        language, genre, status, rating, tags, summary, raw_yaml, indexed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        file_path=excluded.file_path, title=excluded.title, title_ja=excluded.title_ja,
        authors=excluded.authors, isbn_13=excluded.isbn_13, pub_year=excluded.pub_year,
        language=excluded.language, genre=excluded.genre, status=excluded.status,
        rating=excluded.rating, tags=excluded.tags, summary=excluded.summary,
        raw_yaml=excluded.raw_yaml, indexed_at=excluded.indexed_at
    `).run(
      data.id,
      fileName,
      data.title,
      data.title_ja ?? null,
      JSON.stringify(data.authors),
      data.isbn_13 ?? null,
      data.publication_year ?? null,
      data.language ?? null,
      JSON.stringify(data.genre ?? []),
      data.status,
      data.rating ?? null,
      JSON.stringify(data.tags ?? []),
      data.summary ?? null,
      rawYaml,
      now
    );

    // Rebuild FTS for this book
    db.prepare("DELETE FROM books_fts WHERE id = ?").run(data.id);
    db.prepare(`
      INSERT INTO books_fts (id, title, title_ja, authors, summary, tags)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      data.id,
      data.title,
      data.title_ja ?? null,
      data.authors.join(" "),
      data.summary ?? null,
      (data.tags ?? []).join(" ")
    );

    // Highlights
    db.prepare("DELETE FROM highlights WHERE book_id = ?").run(data.id);
    db.prepare("DELETE FROM highlights_fts WHERE book_id = ?").run(data.id);
    for (const h of data.highlights ?? []) {
      db.prepare(`
        INSERT INTO highlights (book_id, highlight_id, page, location, text, note, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.id, h.id, h.page ?? null, h.location ?? null,
        h.text, h.note ?? null, JSON.stringify(h.tags ?? [])
      );
      db.prepare(`
        INSERT INTO highlights_fts (book_id, highlight_id, text, note)
        VALUES (?, ?, ?, ?)
      `).run(data.id, h.id, h.text, h.note ?? null);
    }

    // Key Concepts
    db.prepare("DELETE FROM key_concepts WHERE book_id = ?").run(data.id);
    db.prepare("DELETE FROM key_concepts_fts WHERE book_id = ?").run(data.id);
    for (const c of data.key_concepts ?? []) {
      db.prepare(`
        INSERT INTO key_concepts (book_id, name, description, related_to)
        VALUES (?, ?, ?, ?)
      `).run(data.id, c.name, c.description, JSON.stringify(c.related_to ?? []));
      db.prepare(`
        INSERT INTO key_concepts_fts (book_id, name, description)
        VALUES (?, ?, ?)
      `).run(data.id, c.name, c.description);
    }

    // Action Items
    db.prepare("DELETE FROM action_items WHERE book_id = ?").run(data.id);
    for (const a of data.action_items ?? []) {
      db.prepare(`
        INSERT INTO action_items (book_id, action_id, action, priority, status, deadline)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        data.id, a.id, a.action, a.priority,
        a.status ?? "pending", a.deadline ?? null
      );
    }

    // Connections
    db.prepare("DELETE FROM book_connections WHERE source_id = ?").run(data.id);
    for (const conn of data.connections ?? []) {
      db.prepare(`
        INSERT INTO book_connections (source_id, target_id, relation, note)
        VALUES (?, ?, ?, ?)
        ON CONFLICT DO NOTHING
      `).run(data.id, conn.book_id, conn.relation, conn.note ?? null);
    }
  })();
}
