import Database from "better-sqlite3";

export function openDb(dbPath: string, readonly = false): Database.Database {
  const db = new Database(dbPath, { readonly });
  if (!readonly) {
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      rowid       INTEGER PRIMARY KEY,
      id          TEXT NOT NULL UNIQUE,
      file_path   TEXT NOT NULL UNIQUE,
      title       TEXT NOT NULL,
      title_ja    TEXT,
      authors     TEXT NOT NULL,
      isbn_13     TEXT,
      pub_year    INTEGER,
      language    TEXT,
      genre       TEXT,
      status      TEXT NOT NULL,
      rating      INTEGER,
      tags        TEXT,
      summary     TEXT,
      raw_yaml    TEXT NOT NULL,
      indexed_at  TEXT NOT NULL
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS books_fts USING fts5(
      id UNINDEXED,
      title,
      title_ja,
      authors,
      summary,
      tags,
      tokenize='unicode61 remove_diacritics 1'
    );

    CREATE TABLE IF NOT EXISTS highlights (
      rowid        INTEGER PRIMARY KEY,
      book_id      TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      highlight_id TEXT NOT NULL,
      page         INTEGER,
      location     TEXT,
      text         TEXT NOT NULL,
      note         TEXT,
      tags         TEXT,
      UNIQUE(book_id, highlight_id)
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS highlights_fts USING fts5(
      book_id      UNINDEXED,
      highlight_id UNINDEXED,
      text,
      note,
      tokenize='unicode61 remove_diacritics 1'
    );

    CREATE TABLE IF NOT EXISTS key_concepts (
      rowid      INTEGER PRIMARY KEY,
      book_id    TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      description TEXT NOT NULL,
      related_to TEXT,
      UNIQUE(book_id, name)
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS key_concepts_fts USING fts5(
      book_id     UNINDEXED,
      name,
      description,
      tokenize='unicode61 remove_diacritics 1'
    );

    CREATE TABLE IF NOT EXISTS action_items (
      rowid     INTEGER PRIMARY KEY,
      book_id   TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      action_id TEXT NOT NULL,
      action    TEXT NOT NULL,
      priority  TEXT NOT NULL,
      status    TEXT NOT NULL DEFAULT 'pending',
      deadline  TEXT,
      UNIQUE(book_id, action_id)
    );

    CREATE TABLE IF NOT EXISTS book_connections (
      rowid     INTEGER PRIMARY KEY,
      source_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      target_id TEXT NOT NULL,
      relation  TEXT NOT NULL,
      note      TEXT,
      UNIQUE(source_id, target_id, relation)
    );

    CREATE INDEX IF NOT EXISTS idx_books_status   ON books(status);
    CREATE INDEX IF NOT EXISTS idx_books_rating   ON books(rating);
    CREATE INDEX IF NOT EXISTS idx_books_language ON books(language);
    CREATE INDEX IF NOT EXISTS idx_action_status  ON action_items(status);
    CREATE INDEX IF NOT EXISTS idx_action_priority ON action_items(priority);
    CREATE INDEX IF NOT EXISTS idx_conn_source    ON book_connections(source_id);
    CREATE INDEX IF NOT EXISTS idx_conn_target    ON book_connections(target_id);
  `);
}
