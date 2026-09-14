# GadgetHub REST API

Base URL: `/api/v1`. Protected endpoints use `Authorization: Bearer <token>`.

| Area | Route prefix | Capabilities |
|---|---|---|
| Authentication | `/auth` | Register, login, current user, forgot/reset password |
| Profile | `/profile` | Profile, addresses, wishlist |
| Products | `/products` | Catalogue, details, search/filter/sort, product administration |
| Catalogue | `/catalog` | Categories, brands, variants, images, specifications, inventory |
| Discovery | `/discovery` | Phone finder, comparison, recommendations, views and price alerts |
| Cart | `/cart` | Persistent items, quantity updates and stock validation |
| Orders | `/orders` | Checkout, customer order history and details |
| Commerce | `/commerce` | Promotions, banners, delivery zones, payments, receipts, tracking |
| Services | `/services` | Trade-ins, warranties, repairs, tickets, returns and refunds |
| Reviews | `/reviews` | Ratings, verified-purchase reviews and moderation |
| Loyalty | `/loyalty` | Balance, levels, history and redemption |
| Notifications | `/notifications` | Inbox, read state and multichannel dispatch queue |
| Content | `/content` | Pages, FAQs, contact messages and system settings |
| Authenticity | `/authenticity` | Hashed IMEI/serial registration and device verification |
| Administration | `/admin` | Dashboard, users, audit logs and business reports |

Bank transfer and cash-on-delivery payments support manual verification by authorized staff. EcoCash, OneMoney, card, email, SMS and push endpoints reject requests until their real production providers are configured; the API never simulates a successful external transaction or message.
