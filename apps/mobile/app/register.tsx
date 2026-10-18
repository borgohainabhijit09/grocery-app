import { useRouter } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";

import { Button, ErrorText, Screen, TextField } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { errMessage, firstFieldError } from "@/lib/errors";
import { colors, spacing } from "@/theme";

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp, signingIn } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    try {
      await signUp({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
      });
      router.replace("/(tabs)");
    } catch (err) {
      setError(errMessage(err));
    }
  }

  return (
    <Screen edges={["bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>Create your account</Text>

          {error ? <ErrorText message={error} /> : null}

          <TextField
            label="Full name"
            value={name}
            onChangeText={setName}
            placeholder="Jane Doe"
            error={firstFieldError(error, "name")}
          />
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            error={firstFieldError(error, "email")}
          />
          <TextField
            label="Phone (optional)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="9876543210"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="At least 8 characters"
            error={firstFieldError(error, "password")}
          />

          <Button label="Create account" onPress={submit} loading={signingIn} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg },
  heading: { fontSize: 22, fontWeight: "700", color: colors.text },
});
