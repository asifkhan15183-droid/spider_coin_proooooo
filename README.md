# Spider Coin Telegram Mini App

A Cloudflare Workers + D1 starter implementation for a Telegram Mini App. It includes a mobile-first UI, Telegram `initData` verification, server-authoritative mining, referral attribution, manual task review, internal SPC ledger, withdrawal requests, promotion/supporter payment submissions, streak rewards, admin endpoints, and deployment documentation.

## Important implementation boundaries

- This is an operational starter project, not a launched token, exchange, audited financial product, or guarantee of production readiness.
- SPC is an internal database ledger until the owner deploys a real token and integrates a separately audited on-chain contract.
- Social task completion is manual-review only. A link click is not proof of joining/subscribing.
- Promotion and Supporter Pass transaction hashes are stored as pending submissions. **A hash is not payment proof.** The admin must independently verify the BSC transaction in a trusted explorer or provider before approval. Automated chain verification is not included.
- Withdrawals are disabled by default. The manual admin review endpoint records status; it does not send blockchain funds. No private key or seed phrase is collected.
- No automatic withdrawal signer is included.
- Weekly leaderboard display, Telegram outbound bot notifications, duplicate-account/device fingerprinting, and automatic visitor analytics are not fully implemented; see `LIMITATIONS.md`.
- Bot token is a Cloudflare secret only. It is never exposed in browser code or API responses.

## Local development

1. Install Node.js 20+.
2. Run `npm install`.
3. Copy `.dev.vars.example` to `.dev.vars`, then set `TELEGRAM_BOT_TOKEN` and `ADMIN_IDS`.
4. Create a D1 database and update `database_id` in `wrangler.toml`.
5. Run `npm run db:migrate:local`.
6. Run `npm run dev`.
7. Open through Telegram after configuring a bot and Mini App URL. A plain browser visit cannot pass Telegram authentication.

## Tests

Run `npm test` for the included unit tests. For full end-to-end testing, deploy a staging Worker with a staging D1 database and test from Telegram. Do not use production wallet keys during testing.
