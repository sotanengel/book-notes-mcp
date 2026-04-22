# 読書ノート構造化プロンプト（`prompts/structure.md`）

## 使い方

このプロンプトをユーザーが手元の AI CLI（Claude Code 等）に渡して実行します。
本リポジトリのコードは LLM を呼びません。

```bash
# 例: Claude Code の場合
cat prompts/structure.md inbox/your-note.md | claude > books/your-book-slug.yaml

# または inbox ファイルを明示的に渡す場合
claude -p "$(cat prompts/structure.md)" --context inbox/your-note.md > books/your-book-slug.yaml
```

生成後は必ずバリデーション:

```bash
npm run validate -- books/your-book-slug.yaml
npm run format -- books/your-book-slug.yaml
```

---

## プロンプト本文（ここから下を AI CLI に渡す）

あなたは読書ノートの構造化アシスタントです。
添付された Raw Note を、以下の JSON Schema に準拠する YAML に変換してください。

**スキーマ**: `schema/book-entry.schema.json` を参照すること。

### 必須フィールド

- `schema_version`: 常に `"1.0"`（文字列）
- `id`: `{title-slug}-{last-author-family-name}-{publication-year}` 形式。例: `atomic-habits-clear-2018`。全て小文字・ハイフン区切り・ASCII のみ。
- `slug`: `id` と同一の値
- `title`: 原題（英語書は英語のまま）
- `authors`: 著者名の配列（最低1名）
- `status`: `"to-read"` / `"reading"` / `"completed"` / `"abandoned"` / `"reference"` のいずれか

### フィールド設定ルール

- `highlights[].id`: `h-001`, `h-002` ... の形式（ゼロ埋め3桁）
- `action_items[].id`: `a-001`, `a-002` ... の形式（ゼロ埋め3桁）
- `tags[*]`: 小文字・ハイフン区切りのみ（例: `systems-thinking`）
- `ai_generated`: このプロンプトで生成したフィールドに `true` を設定すること

### 出力制約

- 原文に明示されていない情報は推測せず、該当フィールドを省略する（`null` や空文字列を入れない）
- `highlights[].text` は Raw Note に現れた原文のみを使用し、**決して創作しない**
- 長文引用（400字を超える `text`）は避ける。著作権の範囲内に収める
- `page` が不明な場合は `location` も省略する（`"unknown"` を入れない）
- 日本語メモは日本語のまま保持
- 不確実なフィールドは値の冒頭に `[REVIEW]` を付与

### 禁止事項

- PII（他者の実名・連絡先・住所）の出力
- 業務機密・非公開情報の出力
- 書籍本文の大量複製（ハイライト1件あたり400字以内）

### 出力形式

- **YAML のみ**（前後の説明・コードフェンス・マークダウン不要）
- フィールド順: `schema_version` → `id` → `slug` → `title` → `title_ja` → `authors` → `isbn_13` → `publication_year` → `language` → `genre` → `status` → `read_sessions` → `rating` → `tags` → `summary` → `key_concepts` → `highlights` → `action_items` → `connections` → `open_questions` → `ai_generated`
