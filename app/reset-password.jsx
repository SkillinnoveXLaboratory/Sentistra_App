import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../src/auth-context";
import { completePasswordReset } from "../src/auth-api";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { passwordResetDraft, setPasswordResetDraft } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const redirectTimer = useRef(null);
  const canSubmit = password.length >= 8 && password === confirmPassword && !loading;

  useEffect(() => {
    if (!success && (!passwordResetDraft.email || !passwordResetDraft.resetToken)) router.replace("/forgot-password");
  }, [passwordResetDraft.email, passwordResetDraft.resetToken, router, success]);

  useEffect(() => () => {
    if (redirectTimer.current) clearTimeout(redirectTimer.current);
  }, []);

  const resetPassword = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      await completePasswordReset(passwordResetDraft.resetToken, password);
      setSuccess("Password reset successfully. Redirecting to log in...");
      redirectTimer.current = setTimeout(() => {
        setPasswordResetDraft({ email: "", otpChallengeId: "", resetToken: "" });
        router.dismissAll();
        router.replace("/login");
      }, 1400);
    } catch (requestError) {
      setError(requestError.message || "Unable to reset your password.");
      setLoading(false);
    }
  };

  return <SafeAreaView style={styles.screen} edges={["top", "left", "right", "bottom"]}>
    <StatusBar barStyle="dark-content" />
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.navBar}><Pressable style={styles.backButton} onPress={() => router.back()}><Ionicons name="arrow-back" size={20} color="#111111" /></Pressable><Text style={styles.navTitle}>Create new password</Text></View>
      <View style={styles.content}>
        <Text style={styles.title}>Choose a new password</Text>
        <Text style={styles.copy}>Use at least eight characters. This will sign out other devices for your account.</Text>
        <Text style={styles.label}>New password</Text>
        <TextInput value={password} onChangeText={(value) => { setPassword(value); setError(""); }} placeholder="At least 8 characters" placeholderTextColor="#A0AEC0" secureTextEntry autoCapitalize="none" autoCorrect={false} style={styles.input} />
        <Text style={styles.label}>Confirm new password</Text>
        <TextInput value={confirmPassword} onChangeText={(value) => { setConfirmPassword(value); setError(""); }} placeholder="Enter your password again" placeholderTextColor="#A0AEC0" secureTextEntry autoCapitalize="none" autoCorrect={false} returnKeyType="done" onSubmitEditing={canSubmit ? resetPassword : undefined} style={styles.input} />
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {!!success && <View accessibilityRole="alert" style={styles.successToast}><Ionicons name="checkmark-circle" size={17} color="#067647" /><Text style={styles.successText}>{success}</Text></View>}
        <Pressable style={[styles.button, !canSubmit && styles.buttonDisabled]} disabled={!canSubmit || !!success} onPress={resetPassword}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Reset password</Text>}</Pressable>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, screen: { flex: 1, backgroundColor: "#FFFFFF", paddingHorizontal: 24, paddingTop: 6 }, navBar: { height: 44, justifyContent: "center", alignItems: "center", position: "relative" }, backButton: { position: "absolute", left: 0, height: 40, width: 40, alignItems: "center", justifyContent: "center" }, navTitle: { color: "#111111", fontSize: 14, fontWeight: "700" }, content: { paddingTop: 48 }, title: { color: "#111111", fontSize: 24, fontWeight: "800", marginBottom: 8 }, copy: { color: "#667085", fontSize: 13, lineHeight: 20, marginBottom: 28 }, label: { fontSize: 11, fontWeight: "500", color: "#333333", marginBottom: 6 }, input: { height: 46, borderWidth: 1, borderColor: "#D0D5DD", borderRadius: 8, paddingHorizontal: 12, fontSize: 13, color: "#111111", marginBottom: 16 }, button: { height: 48, borderRadius: 10, backgroundColor: "#6200EE", alignItems: "center", justifyContent: "center" }, buttonDisabled: { backgroundColor: "#B288EE" }, buttonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" }, error: { color: "#B42318", fontSize: 12, marginBottom: 12 }, successToast: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 9, backgroundColor: "#ECFDF3", padding: 12, marginBottom: 14 }, successText: { color: "#067647", flex: 1, fontSize: 12, fontWeight: "600" }
});
