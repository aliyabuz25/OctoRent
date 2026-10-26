# AndroidJS APK

1. Run `npm install` once. The APK builder also needs a Java JDK and AndroidJS's downloaded build tools.
2. Run `npm run android:apk`. On first run it asks for the API server origin and saves it in the ignored local `network.conf`. You can also copy `network.conf.example` and edit it first.
3. The generated APK is `dist-apk/RunStock.apk`.

Use the API origin only, such as `https://stock.example.com` or `http://192.168.1.20:3001`; do not include `/api`. Android emulator builds can use `http://10.0.2.2:3001`. A physical phone must use a server address reachable on its network. `network.conf` is copied into the AndroidJS app assets and the API URL is also embedded into the built mobile JavaScript.

The API allows AndroidJS WebView's opaque `null` origin and its Authorization preflight headers. For HTTPS, use a publicly trusted certificate (or a CA trusted by the device). The server can serve HTTPS directly with `TLS_CERT_FILE`, `TLS_KEY_FILE`, and `PORT`, or sit behind an HTTPS reverse proxy. The APK builder enables Android cleartext traffic only for builds configured with an `http://` API; use that only on a trusted development/LAN network. HTTPS builds disable it.
