# GadgetHub commerce, payments, wishlist, and loyalty

## Source of truth

PostgreSQL is authoritative for signed-in customers. The browser stores a cart copy only for display while signed out. After sign-in, `GET /api/v1/cart` and `GET /api/v1/profile/wishlist` replace browser state with saved server state.

## Cart and wishlist

- `GET /api/v1/cart` loads or creates the customer's cart.
- `POST /api/v1/cart/items` adds a product/variant and validates stock.
- `PATCH /api/v1/cart/items/:id` changes quantity and validates stock.
- `DELETE /api/v1/cart/items/:id` removes an item.
- `GET /api/v1/profile/wishlist` loads saved products.
- `POST /api/v1/profile/wishlist/:productId` saves a product idempotently.
- `DELETE /api/v1/profile/wishlist/:productId` removes it.

## Order lifecycle

`POST /api/v1/orders` validates the address, server cart, inventory, coupon ownership/limits, and server-calculated prices. In one database transaction it creates the order, items, payment and delivery, updates inventory, increments coupon usage, and clears the server cart.

Orders are always saved before payment initialization. A Paynow initialization failure does not delete the order; the frontend retains the payment ID so retrying does not create a duplicate order.

Direct cancellation is limited to unpaid `PLACED` orders and restores inventory. Paid orders require a support-managed refund.

## Paynow

Required environment variables:

```env
PAYNOW_INTEGRATION_ID=...
PAYNOW_INTEGRATION_KEY=...
PUBLIC_API_URL=https://public-api-host.example
FRONTEND_URL=https://store.example
```

- `POST /api/v1/commerce/payments/:id/initialize` starts Paynow or manual payment.
- `GET /api/v1/commerce/payments/:id/status` polls Paynow and persists its signed status.
- `POST /api/v1/commerce/paynow/result` validates Paynow's signature, polls Paynow for confirmation, and persists the result.
- `GET /api/v1/commerce/payments/:id/receipt` returns only confirmed paid receipts.

Paynow card entry is hosted by Paynow. GadgetHub never receives card numbers or CVVs.

Payment state mapping:

| Paynow state | GadgetHub payment | GadgetHub order |
|---|---|---|
| Created/Sent | PROCESSING | PLACED |
| Paid/Awaiting Delivery/Delivered | PAID | PAYMENT_CONFIRMED |
| Cancelled/Disputed | FAILED | PLACED |
| Refunded | REFUNDED | unchanged for staff handling |

## Loyalty and rewards

- A confirmed payment earns `floor(order total in USD)` points: 1 point per $1.
- Awards use the unique `(userId, reason, orderId)` key and cannot be duplicated by repeated Paynow callbacks or polling.
- Bronze: 0–999 points; Silver: 1,000–4,999; Gold: 5,000+.
- Redemption requires at least 100 points and multiples of 100.
- Every 100 points creates a $1 fixed-value, single-use coupon valid for 30 days.
- Reward coupons start with `GH-REWARD-` and can only be used by the account that redeemed them.

Endpoints:

- `GET /api/v1/loyalty` returns balance, tier, rules and history.
- `POST /api/v1/loyalty/redeem` accepts `{ "points": 100 }` and returns the coupon code.

## Operational checks

Use `GET /api/v1/providers/health` as a super administrator. `paynow: true` confirms both Paynow credentials are visible to the running process. Restart the API after editing `.env`.

Run migrations and builds:

```powershell
cd backend
npx prisma migrate deploy
npm run build
cd ..\frontend
npm run build
```
