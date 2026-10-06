import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
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

export default function SignupDetailsScreen() {
  const router = useRouter();
  const { signupDraft, setSignupDraft } = useAuth();
  const [name, setName] = useState(signupDraft.name || "");
  const [phone, setPhone] = useState(signupDraft.phone || "");
  const canContinue = name.trim().length > 0 && phone.trim().length > 0;

  const continueSignup = () => {
    setSignupDraft({ name: name.trim(), phone: phone.trim() });
    router.push("/signup-password");
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
          <Text style={styles.navTitle}>Your details 3 / 4</Text>
        </View>
        <View style={styles.progressBars}>
          <View style={[styles.progressBar, styles.progressBarActive]} />
          <View style={[styles.progressBar, styles.progressBarActive]} />
          <View style={[styles.progressBar, styles.progressBarActive]} />
          <View style={styles.progressBar} />
        </View>
        <View style={styles.content}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor="#A0AEC0"
            autoCapitalize="words"
            returnKeyType="next"
            style={styles.input}
          />
          <Text style={styles.label}>Phone</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Your phone number"
            placeholderTextColor="#A0AEC0"
            keyboardType="phone-pad"
            returnKeyType="done"
            style={styles.input}
          />
          <Pressable
            style={[styles.button, !canContinue && styles.buttonDisabled]}
            disabled={!canContinue}
            onPress={continueSignup}
          >
            <Text style={styles.buttonText}>Continue</Text>
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
});
