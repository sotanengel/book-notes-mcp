import { readFileSync } from "node:fs";
import { basename } from "node:path";
import type Database from "better-sqlite3";
import { parse } from "yaml";

interface TopicNote {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  related_books?: Array<{ book_id: string; note?: string }>;
  connections?: Array<{ topic_id: string; note?: string }>;
}

export function ensureTopicSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS topics (
      rowid       INTEGER PRIMARY KEY,
      id          TEXT NOT NULL UNIQUE,
      file_path   TEXT NOT NULL UNIQUE,
      name        TEXT NOT NULL,
      description TEXT NOT NULL,
      tags        TEXT,
      raw_yaml    TEXT NOT NULL,
      indexed_at  TEXT NOT NULL
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS topics_fts USING fts5(
      id UNINDEXED,
      name,
      description,
      tags,
      tokenize='unicode61 remove_diacritics 1'
    );

    CREATE TABLE IF NOT EXISTS topic_book_links (
      rowid    INTEGER PRIMARY KEY,
      topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      book_id  TEXT NOT NULL,
      note     TEXT,
      UNIQUE(topic_id, book_id)
    );
  `);
}

export function indexTopicFile(db: Database.Database, filePath: string): void {
  const rawYaml = readFileSync(filePath, "utf-8");
  const data = parse(rawYaml) as TopicNote;
  const now = new Date().toISOString();
  const fileName = basename(filePath);

  db.transaction(() => {
    db.prepare(`
      INSERT INTO topics (id, file_path, name, description, tags, raw_yaml, indexed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        file_path=excluded.file_path, name=excluded.name,
        description=excluded.description, tags=excluded.tags,
        raw_yaml=excluded.raw_yaml, indexed_at=excluded.indexed_at
    `).run(
      data.id,
      fileName,
      data.name,
      data.description,
      JSON.stringify(data.tags ?? []),
      rawYaml,
      now
    );

    db.prepare("DELETE FROM topics_fts WHERE id = ?").run(data.id);
    db.prepare(`
      INSERT INTO topics_fts (id, name, description, tags)
      VALUES (?, ?, ?, ?)
    `).run(data.id, data.name, data.description, (data.tags ?? []).join(" "));

    db.prepare("DELETE FROM topic_book_links WHERE topic_id = ?").run(data.id);
    for (const link of data.related_books ?? []) {
      db.prepare(`
        INSERT INTO topic_book_links (topic_id, book_id, note) VALUES (?, ?, ?)
        ON CONFLICT DO NOTHING
      `).run(data.id, link.book_id, link.note ?? null);
    }
  })();
}
