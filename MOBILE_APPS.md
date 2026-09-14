# GadgetHub Flutter apps

Two independent Flutter applications now live beside the existing web frontend and Express API:

- `customer_app`: customer login, catalogue/search, product detail, server cart, and orders.
- `admin_app`: role-gated staff login, business overview, inventory and customers.

## Backend connection

Both apps use `--dart-define=API_URL=...`. Android Emulator uses `http://10.0.2.2:4000/api/v1`; iOS Simulator can use `http://localhost:4000/api/v1`; physical phones need the development computer's LAN address. Production should use `https://api.tinashenyenyesatech.ac.zw/api/v1`.

After installing Flutter, run `./bootstrap.ps1` once inside each app. This creates the standard Android/iOS runner files, installs packages, analyzes the code, and runs the tests.

The existing web frontend remains unchanged and uses the same backend, so product, account, cart, order, and admin data stay consistent across web and mobile.
