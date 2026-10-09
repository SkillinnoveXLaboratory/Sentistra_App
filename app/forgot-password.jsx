import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../src/auth-context";
import { requestPasswordResetOtp } from "../src/auth-api";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { setPasswordResetDraft } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const canSubmit = /\S+@\S+\.\S+/.test(email) && !loading;

  const sendCode = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const result = await requestPasswordResetOtp(normalizedEmail);
      setPasswordResetDraft({ email: normalizedEmail, otpChallengeId: result.challenge_id, resetToken: "" });
      router.push("/reset-password-otp");
    } catch (requestError) {
      setError(requestError.message || "Unable to send a reset code.");
    } finally {
      setLoading(false);
    }
  };

  return <SafeAreaView style={styles.screen} edges={["top", "left", "right", "bottom"]}>
    <StatusBar barStyle="dark-content" />
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.navBar}><Pressable style={styles.backButton} onPress={() => router.back()}><Ionicons name="arrow-back" size={20} color="#111111" /></Pressable><Text style={styles.navTitle}>Reset password</Text></View>
      <View style={styles.content}>
        <Text style={styles.title}>Forgot your password?</Text>
        <Text style={styles.copy}>Enter the email address for your Sentistra account. We will send a six-digit verification code.</Text>
        <Text style={styles.label}>Email</Text>
        <TextInput value={email} onChangeText={(value) => { setEmail(value); setError(""); }} placeholder="example@example.com" placeholderTextColor="#A0AEC0" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} returnKeyType="send" onSubmitEditing={canSubmit ? sendCode : undefined} style={styles.input} />
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <Pressable style={[styles.button, !canSubmit && styles.buttonDisabled]} disabled={!canSubmit} onPress={sendCode}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Send verification code</Text>}</Pressable>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, screen: { flex: 1, backgroundColor: "#FFFFFF", paddingHorizontal: 24, paddingTop: 6 }, navBar: { height: 44, justifyContent: "center", alignItems: "center", position: "relative" }, backButton: { position: "absolute", left: 0, height: 40, width: 40, alignItems: "center", justifyContent: "center" }, navTitle: { color: "#111111", fontSize: 14, fontWeight: "700" }, content: { paddingTop: 48 }, title: { color: "#111111", fontSize: 24, fontWeight: "800", marginBottom: 8 }, copy: { color: "#667085", fontSize: 13, lineHeight: 20, marginBottom: 28 }, label: { fontSize: 11, fontWeight: "500", color: "#333333", marginBottom: 6 }, input: { height: 46, borderWidth: 1, borderColor: "#D0D5DD", borderRadius: 8, paddingHorizontal: 12, fontSize: 13, color: "#111111", marginBottom: 16 }, button: { height: 48, borderRadius: 10, backgroundColor: "#6200EE", alignItems: "center", justifyContent: "center" }, buttonDisabled: { backgroundColor: "#B288EE" }, buttonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" }, error: { color: "#B42318", fontSize: 12, marginBottom: 12 }
});
