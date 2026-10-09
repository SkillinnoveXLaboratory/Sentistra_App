import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../src/auth-context";
import { submitAuthRequest } from "../src/auth-api";
import { getGoogleFirebaseIdToken, signOutGoogle } from "../src/google-auth";

export default function LoginScreen() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const canSubmit = /\S+@\S+\.\S+/.test(email) && password.length > 0 && !loading && !googleLoading;

  const login = async () => {
    setLoading(true);
    setError("");
    try {
      const session = await submitAuthRequest("/login", {
        email: email.trim().toLowerCase(),
        password,
      });
      await setSession(session);
      router.dismissAll();
      router.replace("/dashboard");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    if (loading || googleLoading) return;
    setGoogleLoading(true);
    setError("");
    try {
      const idToken = await getGoogleFirebaseIdToken();
      if (!idToken) return;
      const session = await submitAuthRequest("/google-sign-in", { idToken, mode: "login" });
      await setSession(session);
      router.dismissAll();
      router.replace("/dashboard");
    } catch (requestError) {
      await signOutGoogle();
      setError(requestError.message || "Unable to sign in with Google.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.navBar}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#111111" />
          </Pressable>
          <Text style={styles.navTitle}>Log in</Text>
        </View>
        <View style={styles.header}>
          <Text style={styles.headerText}>Welcome back. Log in to continue to Sentistra.</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="example@example.com"
            placeholderTextColor="#A0AEC0"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            style={styles.input}
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor="#A0AEC0"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={canSubmit ? login : undefined}
            style={styles.input}
          />
          <Pressable style={styles.forgotLink} disabled={loading || googleLoading} onPress={() => router.push("/forgot-password")}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Pressable
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            disabled={!canSubmit}
            onPress={login}
          >
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Log in</Text>}
          </Pressable>
          <View style={styles.dividerRow}><View style={styles.dividerLine} /><Text style={styles.dividerText}>or</Text><View style={styles.dividerLine} /></View>
          <Pressable style={[styles.googleButton, (loading || googleLoading) && styles.googleButtonDisabled]} disabled={loading || googleLoading} onPress={loginWithGoogle} accessibilityRole="button" accessibilityLabel="Continue with Google">
            {googleLoading ? <ActivityIndicator color="#4285F4" /> : <Ionicons name="logo-google" size={18} color="#4285F4" />}<Text style={styles.googleButtonText}>{googleLoading ? "Connecting to Google..." : "Continue with Google"}</Text>
          </Pressable>
        </View>
        <Pressable style={styles.signupLink} onPress={() => router.replace("/auth")}>
          <Text style={styles.signupText}>New to Sentistra? <Text style={styles.signupStrong}>Create an account</Text></Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: "#FFFFFF", paddingHorizontal: 24, paddingTop: 6 },
  navBar: { height: 44, justifyContent: "center", alignItems: "center", position: "relative" },
  backButton: { position: "absolute", left: 0, height: 40, width: 40, alignItems: "center", justifyContent: "center" },
  navTitle: { color: "#111111", fontSize: 14, fontWeight: "700" },
  header: { marginTop: 24, marginBottom: 24, alignItems: "center" },
  headerText: { color: "#666666", fontSize: 12, lineHeight: 19, textAlign: "center", paddingHorizontal: 12 },
  content: { paddingTop: 4 },
  label: { fontSize: 11, fontWeight: "500", color: "#333333", marginBottom: 6 },
  input: { width: "100%", height: 44, borderWidth: 1, borderColor: "#D0D5DD", borderRadius: 8, paddingHorizontal: 12, fontSize: 12, color: "#111111", marginBottom: 16 },
  forgotLink: { alignSelf: "flex-end", marginTop: -8, marginBottom: 18, paddingVertical: 4 },
  forgotText: { color: "#6200EE", fontSize: 12, fontWeight: "700" },
  button: { height: 48, borderRadius: 10, backgroundColor: "#6200EE", alignItems: "center", justifyContent: "center" },
  buttonDisabled: { backgroundColor: "#B288EE" },
  buttonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  error: { color: "#B42318", fontSize: 12, marginBottom: 12 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E2E8F0" },
  dividerText: { color: "#8A94A6", fontSize: 12, textTransform: "lowercase" },
  googleButton: { height: 48, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  googleButtonDisabled: { opacity: 0.65 },
  googleButtonText: { color: "#222222", fontSize: 12, fontWeight: "600" },
  signupLink: { marginTop: "auto", marginBottom: 24, alignItems: "center", paddingVertical: 12 },
  signupText: { color: "#777777", fontSize: 12 },
  signupStrong: { color: "#6200EE", fontWeight: "700" },
});
