# GadgetHub Admin

Separate Flutter staff application. Access is restricted to `STORE_MANAGER` and `SUPER_ADMIN` accounts. It connects to the admin dashboard, sales, inventory, users, and product endpoints.

```sh
flutter pub get
flutter run --dart-define=API_URL=http://10.0.2.2:4000/api/v1
```

Use your computer's LAN IP on a physical device, or the production API URL when releasing.
