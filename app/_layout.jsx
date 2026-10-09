import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { Platform, StatusBar } from "react-native";
import { AuthProvider } from "../src/auth-context";
import { SentistraSplash } from "../src/sentistra-splash";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Layout() {
  const [showLaunchScreen, setShowLaunchScreen] = useState(true);
  const [nativeSplashHidden, setNativeSplashHidden] = useState(false);

  useEffect(() => {
    // Keep the phone's system status bar available throughout the app.
    StatusBar.setHidden(false, "fade");
    if (Platform.OS === "android") {
      StatusBar.setTranslucent(false);
    }

    const fallback = setTimeout(() => {
      if (!nativeSplashHidden) {
        SplashScreen.hideAsync().catch(() => {});
        setNativeSplashHidden(true);
      }
    }, 500);
    return () => clearTimeout(fallback);
  }, [nativeSplashHidden]);

  const hideNativeSplash = () => {
    if (nativeSplashHidden) return;
    SplashScreen.hideAsync().catch(() => {});
    setNativeSplashHidden(true);
  };

  return (
    <AuthProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} hidden={false} />
      {showLaunchScreen ? (
        <SentistraSplash onReady={hideNativeSplash} onComplete={() => setShowLaunchScreen(false)} />
      ) : (
        <Stack screenOptions={{ headerShown: false }} />
      )}
    </AuthProvider>
  );
}
