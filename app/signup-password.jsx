import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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

export default function SignupPasswordScreen() {
  const router = useRouter();
  const { signupDraft, setSignupDraft, setSession } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const canSubmit = password.length >= 8 && password === confirmPassword && !loading;

  useEffect(() => {
    if (!signupDraft.emailVerificationToken || !signupDraft.name || !signupDraft.phone) {
      router.replace(signupDraft.emailVerificationToken ? "/signup-details" : "/email");
    }
  }, [router, signupDraft.emailVerificationToken, signupDraft.name, signupDraft.phone]);

  const createAccount = async () => {
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!signupDraft.email || !signupDraft.emailVerificationToken || !signupDraft.name || !signupDraft.phone) {
      setError("Please verify your email and complete all account details.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const session = await submitAuthRequest("/sign-in", {
        ...signupDraft,
        password,
      });
      await setSession(session);
      setSignupDraft({ email: "", name: "", phone: "", otpChallengeId: "", emailVerificationToken: "" });
      router.dismissAll();
      router.replace("/dashboard");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
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
          <Text style={styles.navTitle}>Create password 4 / 4</Text>
        </View>
        <View style={styles.progressBars}>
          <View style={[styles.progressBar, styles.progressBarActive]} />
          <View style={[styles.progressBar, styles.progressBarActive]} />
          <View style={[styles.progressBar, styles.progressBarActive]} />
          <View style={[styles.progressBar, styles.progressBarActive]} />
        </View>
        <View style={styles.content}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            placeholderTextColor="#A0AEC0"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          <Text style={styles.label}>Confirm password</Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Enter your password again"
            placeholderTextColor="#A0AEC0"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Pressable
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            disabled={!canSubmit}
            onPress={createAccount}
          >
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Create an account</Text>}
          </Pressable>
        </View>
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
  progressBars: { flexDirection: "row", justifyContent: "center", gap: 4, marginTop: 8, marginBottom: 22 },
  progressBar: { width: 18, height: 3, borderRadius: 2, backgroundColor: "#E2E8F0" },
  progressBarActive: { backgroundColor: "#6200EE" },
  content: { paddingTop: 4 },
  label: { fontSize: 11, fontWeight: "500", color: "#333333", marginBottom: 6 },
  input: { width: "100%", height: 44, borderWidth: 1, borderColor: "#D0D5DD", borderRadius: 8, paddingHorizontal: 12, fontSize: 12, color: "#111111", marginBottom: 16 },
  button: { height: 48, borderRadius: 10, backgroundColor: "#6200EE", alignItems: "center", justifyContent: "center" },
  buttonDisabled: { backgroundColor: "#B288EE" },
  buttonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  error: { color: "#B42318", fontSize: 12, marginBottom: 12 },
});
