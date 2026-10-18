import { useRouter } from "expo-router";
import React from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button, RowLink } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { colors, radius, spacing } from "@/theme";

export default function MoreScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const confirmSignOut = () => {
    Alert.alert("Sign out", "Sign out of the admin console?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => void signOut(),
      },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.profile}>
        <Text style={styles.name}>{user?.name ?? "Staff"}</Text>
        <Text style={styles.role}>{user?.role ?? ""}</Text>
        <Text style={styles.email}>{user?.email ?? ""}</Text>
      </View>

      <View style={styles.links}>
        <RowLink
          icon="pricetags-outline"
          label="Products"
          onPress={() => router.push("/products")}
        />
        <RowLink
          icon="albums-outline"
          label="Categories"
          onPress={() => router.push("/categories")}
        />
        <RowLink
          icon="pricetag-outline"
          label="Coupons"
          onPress={() => router.push("/coupons")}
        />
        <RowLink
          icon="cube-outline"
          label="Inventory"
          onPress={() => router.push("/inventory")}
        />
        <RowLink
          icon="people-outline"
          label="Customers"
          onPress={() => router.push("/customers")}
        />
        <RowLink
          icon="bicycle-outline"
          label="Delivery partners"
          onPress={() => router.push("/delivery")}
        />
        <RowLink
          icon="notifications-outline"
          label="Notifications"
          onPress={() => router.push("/notifications")}
        />
        <RowLink
          icon="settings-outline"
          label="Store settings"
          onPress={() => router.push("/settings")}
        />
      </View>

      <Button label="Sign out" variant="danger" onPress={confirmSignOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  profile: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: 2,
  },
  name: { fontSize: 20, fontWeight: "800", color: colors.text },
  role: { fontSize: 13, fontWeight: "700", color: colors.primaryDark, textTransform: "uppercase" },
  email: { fontSize: 13, color: colors.muted, marginTop: spacing.xs },
  links: { gap: spacing.md },
});
