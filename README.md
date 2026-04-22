# book-notes-mcp

ビジネス書の読書ノートを構造化 YAML で管理し、MCP サーバー経由で AI エージェントから検索・参照できるナレッジベース。

**特徴**
- LLM API に一切依存しない（月 $0）
- GitHub 公開リポジトリ前提のセキュリティ設計
- SQLite FTS5 による日英全文検索
- 7 つの MCP Tool で AI エージェントからアクセス可能

---

## Quick Start

```bash
git clone https://github.com/YOUR_NAME/book-notes-mcp
cd book-notes-mcp
npm ci --ignore-scripts

# インデックスを構築
npm run index build

# Claude Desktop に MCP サーバーを登録
# ~/.config/claude/claude_desktop_config.json に追記:
```

```json
{
  "mcpServers": {
    "book-notes": {
      "command": "npx",
      "args": ["tsx", "/path/to/book-notes-mcp/mcp-server/src/index.ts"],
      "env": { "DB_PATH": "/path/to/book-notes-mcp/books.db" }
    }
  }
}
```

---

## 使い方

### 1. 読書ノートを構造化する

```bash
# inbox/ に走り書きを置く（gitignore対象）
cp your-notes.md inbox/

# 手元の AI CLI で YAML を生成
cat prompts/structure.md inbox/your-notes.md | claude > books/your-book-author-2024.yaml

# 検証・整形
npm run validate -- books/your-book-author-2024.yaml
npm run format -- books/your-book-author-2024.yaml

# インデックス更新
npm run index build
```

### 2. CLI コマンド

```bash
npm run validate -- books/           # スキーマ検証
npm run validate -- books/ --strict  # 引用文字数エラーも検出
npm run format -- books/             # YAML 整形
npm run index build                  # SQLite インデックス構築
npm run check-refs                   # connections の参照整合性チェック
```

### 3. MCP Tools

| Tool | 説明 |
|---|---|
| `list_books` | フィルタ付き蔵書一覧 |
| `get_book` | 1 冊の詳細取得 |
| `search_books` | 全文検索（タイトル・著者・サマリー） |
| `search_highlights` | ハイライト横断検索 |
| `search_concepts` | 概念横断検索 |
| `find_connections` | 関連書籍グラフ（depth 1 or 2） |
| `get_actionable_insights` | アクションアイテム抽出 |

---

## Book Entry YAML フォーマット

`books/` ディレクトリの各 YAML ファイルが 1 冊に対応します。

ファイル名: `{title-slug}-{author-family}-{year}.yaml`（例: `atomic-habits-clear-2018.yaml`）

詳細は `schema/book-entry.schema.json` を参照。

---

## セキュリティ

- `inbox/` の Raw Note は `.gitignore` 対象（公開リポジトリに含まれません）
- Takumi Guard (npm.flatt.tech) によるレジストリレベルの悪性パッケージブロック
- 全 GitHub Actions を commit SHA でピン留め
- MCP サーバーは stdio のみ、SQLite は読み取り専用

詳細は [SECURITY.md](SECURITY.md) を参照。

---

## ライセンス

- **Code** (`src/`, `mcp-server/`, `schema/`): [MIT License](LICENSE)
- **Content** (`books/`, `topics/`): [CC-BY-NC-4.0](LICENSE-content)
