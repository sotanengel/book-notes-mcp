# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this repository, please **do not** open a public issue.

Instead, use [GitHub Private Vulnerability Reporting](https://github.com/nagaharasatsudai/book-notes-mcp/security/advisories/new) to report it privately.

We will respond within 7 days.

## Security Design Principles

This repository follows a defense-in-depth approach:

- **Supply chain**: Takumi Guard registry proxy, exact version pinning, `--ignore-scripts`, npm audit signatures
- **CI/CD**: All third-party Actions pinned to commit SHA, minimal `GITHUB_TOKEN` permissions, no `pull_request_target`
- **Repository**: Signed commits required, branch protection on `main`, Secret Scanning + Push Protection enabled
- **Secrets**: This repo requires no secrets by design. No API keys, no tokens committed.
- **Content**: `inbox/` excluded from git. No PII, no confidential information, no bulk reproduction of copyrighted text.
- **MCP server**: stdio-only by default, read-only SQLite, all tool inputs validated with zod

## Accidental Secret Commit Procedure

If a secret is accidentally committed:

1. **Immediately revoke** the key/token at the issuing service
2. Remove from git history: `git filter-repo --path <file> --invert-paths`
3. Force-push (requires branch protection override — contact repo admin)
4. Notify any affected services

## Dependency Policy

- Direct dependencies are limited to: `@modelcontextprotocol/sdk`, `ajv`, `ajv-formats`, `better-sqlite3`, `commander`, `yaml`, `zod`
- Any new dependency requires a GitHub Issue with justification before adding
- Dependabot PRs require human review — auto-merge is disabled
