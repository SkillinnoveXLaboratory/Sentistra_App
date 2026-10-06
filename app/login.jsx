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

export default function LoginScreen() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const canSubmit = /\S+@\S+\.\S+/.test(email) && password.length > 0 && !loading;

  const login = async () => {
    setLoading(true);
    setError("");
    try {
      const session = await submitAuthRequest("/login", {
        email: email.trim().toLowerCase(),
        password,
      });
      await setSession(session);
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
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Pressable
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            disabled={!canSubmit}
            onPress={login}
          >
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Log in</Text>}
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
  button: { height: 48, borderRadius: 10, backgroundColor: "#6200EE", alignItems: "center", justifyContent: "center" },
  buttonDisabled: { backgroundColor: "#B288EE" },
  buttonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  error: { color: "#B42318", fontSize: 12, marginBottom: 12 },
  signupLink: { marginTop: "auto", marginBottom: 24, alignItems: "center", paddingVertical: 12 },
  signupText: { color: "#777777", fontSize: 12 },
  signupStrong: { color: "#6200EE", fontWeight: "700" },
});
