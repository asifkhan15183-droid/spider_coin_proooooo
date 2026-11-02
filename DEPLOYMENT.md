# Beginner Cloudflare Deployment (no GitHub required)

## 1. Prepare the project
- Download and unzip `Spider-Coin-Full-Project.zip` on a computer.
- Install Node.js 20 or later.
- Open a terminal in the project folder and run `npm install`.

## 2. Create D1
- Sign in to the Cloudflare dashboard.
- Open **Workers & Pages → D1 SQL Database → Create database**.
- Name it `spider-coin-db`.
- Copy the database ID into `wrangler.toml`, replacing `REPLACE_WITH_YOUR_D1_DATABASE_ID`.
- Run `npx wrangler d1 migrations apply DB --remote`.

## 3. Configure secrets
Run these commands from the project folder:
```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put ADMIN_IDS
```
For `ADMIN_IDS`, enter comma-separated numeric Telegram user IDs, for example `123456789,987654321`. Never put the bot token in frontend files, `wrangler.toml`, screenshots, or public repositories.

## 4. Configure project values
Edit `[vars]` in `wrangler.toml`:
- `BOT_USERNAME`
- `USDT_RECEIVER_ADDRESS`
- `MINING_RATE_PER_HOUR`
- `REFERRAL_REWARD`
- promotion prices
- `WITHDRAWALS_ENABLED` (keep `false` until a real token, payout process, and safeguards exist)

The official BSC USDT contract is prefilled as a commonly used address, but the owner must independently verify the correct token contract and chain before accepting payments. Never assume a transaction hash proves payment.

## 5. Deploy
```bash
npx wrangler deploy
```
Cloudflare prints the Worker URL. If you prefer dashboard-only deployment, upload the project using the Cloudflare Workers tooling supported by your account; a D1 binding, secrets, migrations, and Worker configuration still need to be set explicitly. A ZIP upload alone does not create a D1 database or secrets.

## 6. Configure Telegram
- In Telegram, open `@BotFather`.
- Create a bot with `/newbot` or select your existing bot.
- Set the Mini App using BotFather's Mini App / menu button configuration.
- Use the deployed HTTPS Worker URL as the Mini App URL.
- Set `BOT_USERNAME` to the bot username without `@`.
- Set the same bot token as the Worker secret `TELEGRAM_BOT_TOKEN`.

## 7. Verify deployment
- Visit `https://YOUR-WORKER.workers.dev/api/health`; expect `{ "ok": true, ... }`.
- Open the Mini App from Telegram, not a normal browser, and verify profile authentication.
- Test mining start, wait through the configured cycle on a staging instance, and claim.
- Test referral using a second test Telegram account.
- Create a manual task and verify its pending claim in D1/admin flow.
- Keep withdrawals disabled until the project owner has completed token, legal, security, and payout setup.

## 8. Updating
After changing code, run `npm test`, then `npx wrangler deploy`. Apply new migrations with `npx wrangler d1 migrations apply DB --remote`.
