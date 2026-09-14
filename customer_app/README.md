# GadgetHub Customer

Flutter customer app connected to the GadgetHub REST API. It includes customer authentication, live product search/catalogue, cart sync, and order history.

Run on Android emulator:

```sh
flutter pub get
flutter run --dart-define=API_URL=http://10.0.2.2:4000/api/v1
```

For a physical device use your computer's LAN IP. For production use `https://api.tinashenyenyesatech.ac.zw/api/v1`.
