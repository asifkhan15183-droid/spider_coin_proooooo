# Known limitations / remaining manual work

1. **On-chain payment verification:** Promotion and Supporter Pass submissions are pending records only. A human must verify chain, official contract, recipient, amount, success status, confirmations and unused transaction hash before approving. The admin approval endpoint records the human decision; it does not independently query BSC.
2. **Wallet transfers:** Internal user-to-user SPC send/receive is not implemented in this release. No on-chain wallet connection or token transfer is implemented.
3. **Withdrawals:** Disabled by default. If enabled, requests are debited and queued; approval/rejection is manual. The application does not broadcast a BEP20 transaction or verify the payout receipt.
4. **Task verification:** Social join/subscribe tasks are manual review only. Automated membership verification requires bot admin rights and the relevant Telegram APIs; YouTube/TikTok verification needs provider-specific integrations.
5. **Telegram notifications:** In-app notification table/API exists. Outbound Telegram Bot API notifications and broadcast scheduling are not implemented.
6. **Weekly leaderboard:** Referral history/count exists, but a weekly ranking aggregation and top-10 winners UI is not implemented.
7. **Analytics:** Basic live counts are derived from D1. Daily snapshots, visitor source analytics, geography, device analytics, and campaign visitor counting are not implemented.
8. **Fraud controls:** Self-referral and unique referred-user constraints are implemented. Device/IP correlation and advanced fake-account scoring are not implemented.
9. **Admin UI:** Core admin actions and dashboard are included, but a full moderation queue UI for every payment/task/supporter flow is not complete. Use the API and D1 for review until expanded.
10. **Daily streak:** Server-side day progression and 10 SPC increments through day 21 are implemented. Missing a day resets to day 1.
11. **Allocation chart:** The configured percentages are displayed as static product information. They do not allocate real tokens.
12. **Telegram bot username settings:** Admin can store username and Mini App URL in D1. Worker deployment vars are the runtime source for referral URLs; after editing in the panel, update `BOT_USERNAME` in Worker variables and redeploy for the runtime value to change.
13. **Database transactions:** D1 batch operations are used, but production financial use needs further concurrency/race-condition review and load testing.
