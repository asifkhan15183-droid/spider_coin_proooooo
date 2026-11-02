# API overview

All authenticated endpoints require `x-telegram-init-data` containing the Telegram Web App `initData` string.

- `GET /api/health` — health check (public)
- `GET /api/config` — safe public configuration
- `POST /api/auth` — verify Telegram identity and upsert user
- `GET /api/profile` — current user profile
- `GET /api/mining`, `POST /api/mining/start`, `POST /api/mining/claim`
- `GET /api/referrals`
- `GET /api/tasks`, `POST /api/tasks/claim`
- `GET /api/wallet`, `POST /api/wallet/withdraw`
- `GET /api/promotions`, `POST /api/promotions`
- `GET /api/investor`, `POST /api/investor/pass`
- `GET /api/notifications`, `POST /api/notifications/read`
- `GET /api/streak`, `POST /api/streak/claim`
- Admin: `GET /api/admin/overview`, `GET /api/admin/users`
- Admin: `POST /api/admin/tasks`, `/api/admin/task-review`, `/api/admin/withdrawal-review`, `/api/admin/user-adjust`, `/api/admin/user-status`, `/api/admin/promotion-review`, `/api/admin/bot-settings`

Admin routes require the authenticated Telegram ID to be present in the Worker secret `ADMIN_IDS`.
