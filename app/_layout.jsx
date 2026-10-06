import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../src/auth-context";
import { SentistraSplash } from "../src/sentistra-splash";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Layout() {
  const [showLaunchScreen, setShowLaunchScreen] = useState(true);
  const [nativeSplashHidden, setNativeSplashHidden] = useState(false);

  useEffect(() => {
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
      <StatusBar style="dark" />
      {showLaunchScreen ? (
        <SentistraSplash onReady={hideNativeSplash} onComplete={() => setShowLaunchScreen(false)} />
      ) : (
        <Stack screenOptions={{ headerShown: false }} />
      )}
    </AuthProvider>
  );
}
