# Project Rules for Claude

## Adding or modifying CLI commands

When you add, rename, or remove a CLI command, you MUST also do ALL of the following:

1. **Register in `src/cli/index.ts`** — wire up the commander action
2. **Add to `package.json` scripts** — one `npm run <name>` entry per user-facing command
3. **Update `README.md`** — add `npm run <name>` to the "CLI コマンド一覧" section

The CI step `Check README documents all CLI scripts` (`node scripts/check-readme.mjs`)
will fail the build if any script in `package.json` is absent from `README.md`.
Do not merge a PR with this check failing.

### What counts as "user-facing"

Every script that is NOT in the `TOOLING` set inside `scripts/check-readme.mjs` is
user-facing and must appear in README. Current tooling exclusions:
`build`, `test`, `test:watch`, `typecheck`, `lint`, `lint:fix`, `prepare`, `check:readme`

If you add a new tooling-only script and don't want it checked, add its name to that set.

## General

- Run `npm run check:readme` locally before pushing to catch README gaps early.
- Keep the README "CLI コマンド一覧" section sorted: workflow commands first, then
  individual commands, then memo commands.
