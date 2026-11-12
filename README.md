# Ollamapp

On-device chat, images, vision and Whisper on Android. Models stay on the phone. You can also point it at an OpenAI-compatible server on the LAN (Ollama, LM Studio, LocalAI).

Fork of [Off Grid AI](https://github.com/off-grid-ai/OGAM) without Pro, pairing or nags. App id `com.rm.ollamapp`. Native Java/Kotlin packages stay `ai.offgridmobile`.

## Build

Node 20+, JDK 17, Android SDK. Arm64 only, minSdk 24.

```bash
npm install
npx react-native run-android --mode=debug --appId com.rm.ollamapp.dev
```

Debug installs as `com.rm.ollamapp.dev`. Release is `com.rm.ollamapp`.

```bash
cd android && ./gradlew assembleDebug
```

iOS is still in the tree (`cd ios && pod install`, then `npm run ios`).

MIT, same as upstream.
