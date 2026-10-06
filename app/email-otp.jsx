import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../src/auth-context";
import { requestSignupOtp, verifySignupOtp } from "../src/auth-api";

export default function EmailOtpScreen() {
  const router = useRouter();
  const { signupDraft, setSignupDraft } = useAuth();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([]);
  const [remaining, setRemaining] = useState(60);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!signupDraft.email || !signupDraft.otpChallengeId) router.replace("/email");
  }, [router, signupDraft.email, signupDraft.otpChallengeId]);

  useEffect(() => {
    if (remaining <= 0) return undefined;
    const timer = setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  const verifyCode = async () => {
    const code = digits.join("");
    if (code.length !== 6 || loading) return;
    setLoading(true);
    setError("");
    try {
      const result = await verifySignupOtp(signupDraft.email, signupDraft.otpChallengeId, code);
      setSignupDraft({ emailVerificationToken: result.verification_token });
      router.replace("/signup-details");
    } catch (requestError) {
      setError(requestError.message || "Unable to verify this code.");
    } finally {
      setLoading(false);
    }
  };

  const updateDigit = (value, index) => {
    const enteredDigits = value.replace(/\D/g, "");
    if (!enteredDigits) {
      setDigits((current) => current.map((digit, digitIndex) => digitIndex === index ? "" : digit));
      return;
    }
    setDigits((current) => {
      const next = [...current];
      enteredDigits.slice(0, 6 - index).split("").forEach((digit, offset) => { next[index + offset] = digit; });
      return next;
    });
    inputRefs.current[Math.min(5, index + enteredDigits.length)]?.focus();
  };

  const moveBackOnEmpty = (event, index) => {
    if (event.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const resendCode = async () => {
    if (remaining > 0 || resending) return;
    setResending(true);
    setError("");
    try {
      const result = await requestSignupOtp(signupDraft.email);
      setSignupDraft({ otpChallengeId: result.challenge_id, emailVerificationToken: "" });
      setDigits(["", "", "", "", "", ""]);
      setRemaining(60);
    } catch (requestError) {
      setError(requestError.message || "Unable to resend the verification code.");
    } finally {
      setResending(false);
    }
  };

  const resendLabel = resending ? "Sending..." : remaining > 0 ? "Resend code in " + remaining + "s" : "Resend code";
  const accountExists = /already has a Sentistra account/i.test(error);
  return <SafeAreaView style={styles.screen} edges={["top", "left", "right", "bottom"]}>
    <StatusBar barStyle="dark-content" />
    <View style={styles.navBar}><Pressable style={styles.backButton} onPress={() => router.back()}><Ionicons name="arrow-back" size={20} color="#111111" /></Pressable><Text style={styles.navTitle}>Verify email 2 / 4</Text></View>
    <View style={styles.progressBars}><View style={[styles.progressBar, styles.progressBarActive]} /><View style={[styles.progressBar, styles.progressBarActive]} /><View style={styles.progressBar} /><View style={styles.progressBar} /></View>
    <View style={styles.content}>
      <Text style={styles.title}>Check your inbox</Text>
      <Text style={styles.copy}>We sent a six-digit code to {signupDraft.email}.</Text>
      <View style={styles.otpRow}>{digits.map((digit, index) => <TextInput key={index} ref={(input) => { inputRefs.current[index] = input; }} value={digit} onChangeText={(value) => { updateDigit(value, index); setError(""); }} onKeyPress={(event) => moveBackOnEmpty(event, index)} keyboardType="number-pad" autoFocus={index === 0} maxLength={6} style={styles.otpCell} textAlign="center" />)}</View>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {accountExists && <Pressable style={styles.signInLink} onPress={() => router.replace("/login")}><Text style={styles.signInText}>Go to Sign In</Text></Pressable>}
      <Pressable style={[styles.button, (digits.join("").length !== 6 || loading) && styles.buttonDisabled]} disabled={digits.join("").length !== 6 || loading} onPress={verifyCode}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Verify email</Text>}</Pressable>
      <Pressable disabled={remaining > 0 || resending} onPress={resendCode} style={styles.resend}><Text style={[styles.resendText, remaining > 0 && styles.resendDisabled]}>{resendLabel}</Text></Pressable>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF", paddingHorizontal: 24, paddingTop: 6 },
  navBar: { height: 44, justifyContent: "center", alignItems: "center", position: "relative" },
  backButton: { position: "absolute", left: 0, height: 40, width: 40, alignItems: "center", justifyContent: "center" },
  navTitle: { color: "#111111", fontSize: 14, fontWeight: "700" },
  progressBars: { flexDirection: "row", justifyContent: "center", gap: 4, marginTop: 8, marginBottom: 28 },
  progressBar: { width: 18, height: 3, borderRadius: 2, backgroundColor: "#E2E8F0" },
  progressBarActive: { backgroundColor: "#6200EE" },
  content: { paddingTop: 4 },
  title: { color: "#111111", fontSize: 23, fontWeight: "800", marginBottom: 8 },
  copy: { color: "#667085", fontSize: 13, lineHeight: 20, marginBottom: 22 },
  otpRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 14 },
  otpCell: { flex: 1, height: 56, borderWidth: 1, borderColor: "#D0D5DD", borderRadius: 10, color: "#111111", fontSize: 22, fontWeight: "700", textAlign: "center", paddingHorizontal: 0 },
  button: { height: 48, borderRadius: 10, backgroundColor: "#6200EE", alignItems: "center", justifyContent: "center" },
  buttonDisabled: { backgroundColor: "#B288EE" },
  buttonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  resend: { alignItems: "center", paddingVertical: 20 },
  resendText: { color: "#6200EE", fontSize: 13, fontWeight: "700" },
  resendDisabled: { color: "#98A2B3" },
  error: { color: "#B42318", fontSize: 12, marginBottom: 12 },
  signInLink: { alignItems: "center", paddingBottom: 12 },
  signInText: { color: "#6200EE", fontSize: 13, fontWeight: "700" },
});
