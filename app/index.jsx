import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  ImageBackground,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../src/auth-context";

const backgroundImage = require("../assets/images/index_img.png");

export default function App() {
  const router = useRouter();
  const { user, sessionReady } = useAuth();

  useEffect(() => {
    if (sessionReady && user) router.replace("/dashboard");
  }, [router, sessionReady, user]);

  if (sessionReady && user) return null;

  const openNextScreen = () => {
    router.push("/auth");
  };

  const openLogin = () => {
    router.push("/login");
  };

  return (
    <ImageBackground source={backgroundImage} resizeMode="cover" style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
          <View style={styles.spacer} />
          <View style={styles.content}>
            <Text style={styles.title}>Welcome to Sentistra</Text>
            <Text style={styles.subtitle}>
              Refine your writing, humanize your ideas, and understand your AI score with confidence.
            </Text>

            <Pressable style={styles.primaryLightButton} onPress={openNextScreen}>
              <Text style={styles.primaryLightButtonText}>Create an account</Text>
            </Pressable>

            <Pressable onPress={openLogin} hitSlop={10}>
              <Text style={styles.loginText}>
                Already have an account? <Text style={styles.loginStrong}>Log in</Text>
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#2E0A63",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(55, 0, 140, 0.48)",
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 6,
  },
  spacer: {
    flex: 1,
  },
  content: {
    paddingBottom: 34,
    alignItems: "center",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 14,
  },
  subtitle: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 28,
    paddingHorizontal: 10,
  },
  primaryLightButton: {
    width: "100%",
    height: 48,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  primaryLightButtonText: {
    color: "#111111",
    fontSize: 13,
    fontWeight: "700",
  },
  loginText: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    textAlign: "center",
  },
  loginStrong: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
