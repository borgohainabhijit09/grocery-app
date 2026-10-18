import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button, ErrorText, Screen, TextField } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { api } from "@/lib/api";
import { errMessage } from "@/lib/errors";
import { colors, spacing } from "@/theme";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signInWithOtp, signingIn } = useAuth();

  const [mode, setMode] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitPassword() {
    setError(null);
    try {
      await signIn(email.trim(), password);
      router.replace("/(tabs)");
    } catch (err) {
      setError(errMessage(err));
    }
  }

  async function requestOtp() {
    setError(null);
    setBusy(true);
    try {
      const res = await api.otpRequest(phone.trim());
      setOtpSent(true);
      setDevCode(res.devCode ?? null);
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function submitOtp() {
    setError(null);
    try {
      await signInWithOtp(phone.trim(), code.trim());
      router.replace("/(tabs)");
    } catch (err) {
      setError(errMessage(err));
    }
  }

  return (
    <Screen edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>Fresh Basket</Text>
          <Text style={styles.tagline}>Daily essentials, delivered fresh.</Text>

          <View style={styles.modeRow}>
            <Text
              style={[styles.mode, mode === "password" && styles.modeActive]}
              onPress={() => setMode("password")}
            >
              Email
            </Text>
            <Text
              style={[styles.mode, mode === "otp" && styles.modeActive]}
              onPress={() => setMode("otp")}
            >
              Phone OTP
            </Text>
          </View>

          {error ? <ErrorText message={error} /> : null}

          {mode === "password" ? (
            <>
              <TextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@example.com"
              />
              <TextField
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
              />
              <Button label="Sign in" onPress={submitPassword} loading={signingIn} />
            </>
          ) : (
            <>
              <TextField
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="9876543210"
              />
              {otpSent ? (
                <>
                  <TextField
                    label="Verification code"
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    placeholder="123456"
                  />
                  {devCode ? <Text style={styles.devCode}>Dev code: {devCode}</Text> : null}
                  <Button label="Verify & sign in" onPress={submitOtp} loading={signingIn} />
                </>
              ) : (
                <Button label="Send code" onPress={requestOtp} loading={busy} />
              )}
            </>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>New here? </Text>
            <Link href="/register" style={styles.link}>
              Create an account
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg, justifyContent: "center", flexGrow: 1 },
  brand: { fontSize: 30, fontWeight: "800", color: colors.primary },
  tagline: { fontSize: 14, color: colors.muted, marginTop: -spacing.md },
  modeRow: { flexDirection: "row", gap: spacing.lg, marginVertical: spacing.sm },
  mode: { fontSize: 15, fontWeight: "600", color: colors.muted },
  modeActive: { color: colors.primary, borderBottomWidth: 2, borderBottomColor: colors.primary },
  devCode: { color: colors.info, fontSize: 13 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: spacing.sm },
  footerText: { color: colors.muted },
  link: { color: colors.primary, fontWeight: "700" },
});
