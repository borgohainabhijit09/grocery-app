import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button, ErrorText, Screen, TextField } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { errMessage } from "@/lib/errors";
import { colors, radius, spacing } from "@/theme";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signingIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    try {
      await signIn(email.trim(), password);
      router.replace("/(tabs)");
    } catch (err) {
      setError(errMessage(err));
    }
  }, [email, password, signIn, router]);

  return (
    <Screen edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Text style={styles.brandMark}>Fresh Basket</Text>
            <Text style={styles.brandSub}>Admin Console</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Staff sign in</Text>
            <Text style={styles.subtitle}>
              Sign in with your admin or staff account to manage the store.
            </Text>

            {error ? <ErrorText message={error} /> : null}

            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="admin@grocery.test"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
            />

            <Button label="Sign in" onPress={() => void submit()} loading={signingIn} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.xl, justifyContent: "center", flexGrow: 1 },
  brand: { alignItems: "center", gap: spacing.xs },
  brandMark: { fontSize: 26, fontWeight: "800", color: colors.text },
  brandSub: { fontSize: 14, color: colors.muted, letterSpacing: 1, textTransform: "uppercase" },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: { fontSize: 20, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 14, color: colors.muted, marginBottom: spacing.sm },
});
