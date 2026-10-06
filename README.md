# Sentistra App

Sentistra is a mobile research-writing workspace with text and document humanization, AI detection, private document storage, subscription access, and account controls.

## Local development

```bash
npm ci
npx expo start
```

For native Google Sign-In, Cashfree, Firebase, and file-sharing capabilities, use an Android development build rather than Expo Go.

## Test APK workflow

The `Build test APK` GitHub Actions workflow runs on pushes to `master` and can also be started manually from the Actions tab. It creates an optimized Android release APK and stores it as a GitHub Actions artifact for 14 days.

This workflow builds an APK only. It does not publish an AAB or upload anything to Google Play.

## Security

Do not commit server credentials, payment keys, Firebase Admin keys, `.env` files, signing keys, or private certificates. Configure sensitive values only in the relevant deployment environment or GitHub Secrets.
