import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { submitAuthRequest } from "../src/auth-api";
import { getGoogleFirebaseIdToken, signOutGoogle } from "../src/google-auth";
import { useAuth } from "../src/auth-context";

function SocialButton({ icon, label, iconColor, onPress, disabled }) {
  return (
    <Pressable style={[styles.socialButton, disabled && styles.socialButtonDisabled]} onPress={onPress} disabled={disabled}>
      <Ionicons name={icon} size={18} color={iconColor} />
      <Text style={styles.socialButtonText}>{label}</Text>
    </Pressable>
  );
}

export default function AuthScreen() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const continueWithGoogle = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    setError("");

    try {
      const idToken = await getGoogleFirebaseIdToken();
      if (!idToken) return;
      const session = await submitAuthRequest("/google-sign-in", { idToken });
      await setSession(session);
      router.replace("/dashboard");
    } catch (requestError) {
      await signOutGoogle();
      setError(requestError.message || "Unable to continue with Google.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right", "bottom"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.navBar}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#111111" />
        </Pressable>
        <Text style={styles.navTitle}>Create new account</Text>
      </View>

      <View style={styles.header}>
        <Text style={styles.headerText}>
          Create your free Sentistra account to humanize text, analyze documents,
          and keep your work in one private place.
        </Text>
      </View>

      <Pressable style={styles.primaryButton} onPress={() => router.push("/email")}>
        <Text style={styles.primaryButtonText}>Continue with email</Text>
      </Pressable>

      <Text style={styles.divider}>or</Text>

      <View style={styles.socialGroup}>
        <SocialButton
          icon="logo-google"
          label={googleLoading ? "Connecting to Google..." : "Continue with Google"}
          iconColor="#4285F4"
          onPress={continueWithGoogle}
          disabled={googleLoading}
        />
      </View>

      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}

      <Text style={styles.terms}>
        By using Sentistra, you agree to the{"\n"}
        <Text style={styles.termsStrong}>Terms</Text> and{" "}
        <Text style={styles.termsStrong}>Privacy Policy</Text>.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 6,
  },
  navBar: {
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 0,
    height: 40,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    color: "#111111",
    fontSize: 14,
    fontWeight: "700",
  },
  header: {
    marginTop: 24,
    marginBottom: 24,
    alignItems: "center",
  },
  headerText: {
    color: "#666666",
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  primaryButton: {
    height: 48,
    borderRadius: 10,
    backgroundColor: "#6200EE",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  divider: {
    textAlign: "center",
    color: "#888888",
    fontSize: 12,
    marginVertical: 18,
  },
  socialGroup: {
    gap: 10,
  },
  socialButton: {
    height: 48,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  socialButtonText: {
    color: "#222222",
    fontSize: 12,
    fontWeight: "600",
  },
  socialButtonDisabled: { opacity: 0.65 },
  error: { marginTop: 12, color: "#B42318", fontSize: 12, textAlign: "center" },
  terms: {
    marginTop: "auto",
    marginBottom: 24,
    color: "#777777",
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },
  termsStrong: {
    color: "#444444",
    fontWeight: "700",
  },
});
