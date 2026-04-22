# 読書ノート追記プロンプト（`prompts/append.md`）

既存の Book Entry に新しい highlights / action_items / key_concepts を追記する場合に使用します。

## 使い方

```bash
# 既存エントリに新しいメモを追記
claude -p "$(cat prompts/append.md)" \
  --context books/atomic-habits-clear-2018.yaml \
  --context inbox/atomic-habits-reread-notes.md \
  > /tmp/merged.yaml && mv /tmp/merged.yaml books/atomic-habits-clear-2018.yaml

npm run validate -- books/atomic-habits-clear-2018.yaml
npm run format -- books/atomic-habits-clear-2018.yaml
```

---

## プロンプト本文

あなたは読書ノートの構造化アシスタントです。
「既存の Book Entry YAML」と「新しい Raw Note」が添付されています。

**タスク**: Raw Note の内容を既存エントリに追記してください。

### 追記ルール

- 既存の `id`, `slug`, `title`, `authors`, `status` などのメタデータは変更しない
- 新しい `highlights` は既存の続き番号から付与（既に `h-003` まであれば `h-004` から）
- 新しい `action_items` も同様（`a-XXX` の続き番号）
- 既存の `key_concepts` に重複する概念は追加しない。補足情報がある場合は既存エントリの `description` を更新
- `summary` は既存を維持する（必要な場合のみ末尾に補足を追加）
- `ai_generated` フィールドを追記した内容に合わせて更新（追記したフィールドに `true`）

### 出力制約

`structure.md` と同じルールに従う（原文のみ引用、400字以内、禁止事項を遵守）

### 出力形式

- 完全な YAML を出力（差分ではなく全体）
- YAML のみ（前後の説明不要）
