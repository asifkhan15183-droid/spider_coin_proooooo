# Security Notes

## Authentication and authorization
- Every protected API call validates Telegram Web App `initData` using the bot token and checks the auth timestamp.
- Admin access is determined server-side from `ADMIN_IDS`; browser-supplied roles or IDs are not trusted.
- The bot token is read only from a Cloudflare Worker secret.

## Financial integrity
- Balance, mining accrual, referrals, task rewards, and streak rewards are calculated/updated server-side.
- The browser counter is display-only.
- Database transaction references and unique constraints reduce duplicate reward/payment replay risk.
- Promotion and supporter payment hashes are not automatically trusted or verified on-chain.
- Withdrawals are disabled by default. Manual approval only records the review; an actual payout must be performed separately and safely by the owner.

## Web security
- Input is bounded and validated; SQL uses prepared statements.
- Basic per-IP in-memory rate limiting is included. Cloudflare rate limiting/WAF should also be configured because Worker isolate memory is not a global durable rate limiter.
- Security headers include CSP, frame restrictions, and MIME sniffing protection.
- D1 protects against SQL injection through prepared statements; output is HTML-escaped in the UI.

## Production checklist
- Use a dedicated bot and staging D1 for tests.
- Restrict Worker dashboard access and rotate compromised secrets.
- Configure Cloudflare WAF/rate limits and alerting.
- Add idempotent, atomic ledger operations and reconciliation before handling material value.
- Have the payment recipient, token contract, chain ID, amount, confirmations, recipient and transaction uniqueness checked through a trusted BSC RPC/indexer before auto-activating campaigns.
- Obtain independent smart-contract/security review before deploying a token or enabling payouts.
