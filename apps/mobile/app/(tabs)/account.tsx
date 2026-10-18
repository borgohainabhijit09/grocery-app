import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Badge, Button, EmptyState } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { API_BASE_URL } from "@/lib/api";
import { registerForPush } from "@/lib/push";
import { colors, radius, spacing } from "@/theme";

export default function AccountScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (user) void registerForPush();
  }, [user]);

  if (!user) {
    return (
      <EmptyState
        title="Welcome to Fresh Basket"
        message="Sign in to manage your orders, addresses and profile."
        action={
          <View style={styles.authActions}>
            <Button label="Sign in" onPress={() => router.push("/login")} />
            <Button
              label="Create account"
              variant="outline"
              onPress={() => router.push("/register")}
            />
          </View>
        }
      />
    );
  }

  function confirmSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() },
    ]);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.badges}>
            {user.phone ? (
              <Badge
                label={user.phoneVerified ? "Phone verified" : "Phone unverified"}
                color={user.phoneVerified ? colors.primaryDark : colors.muted}
                bg={user.phoneVerified ? colors.primarySoft : "#f1f5f9"}
              />
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.menu}>
        <MenuRow
          icon="receipt-outline"
          label="My orders"
          onPress={() => router.push("/orders")}
        />
        <MenuRow
          icon="location-outline"
          label="Delivery addresses"
          onPress={() => router.push("/addresses")}
        />
        <MenuRow
          icon="leaf-outline"
          label="Continue shopping"
          onPress={() => router.push("/shop")}
        />
      </View>

      <Button label="Sign out" variant="danger" onPress={confirmSignOut} />

      <Text style={styles.foot}>API: {API_BASE_URL}</Text>
    </ScrollView>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  authActions: { gap: spacing.sm, width: 240 },
  profile: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: "center",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 22, fontWeight: "800", color: colors.primaryDark },
  profileInfo: { flex: 1, gap: 2 },
  name: { fontSize: 18, fontWeight: "700", color: colors.text },
  email: { fontSize: 13, color: colors.muted },
  badges: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.xs },
  menu: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuLabel: { flex: 1, fontSize: 15, color: colors.text },
  foot: { textAlign: "center", color: colors.muted, fontSize: 11 },
});
