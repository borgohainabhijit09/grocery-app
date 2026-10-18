import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "@/context/auth";
import { colors } from "@/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerTintColor: colors.primary,
            headerTitleStyle: { color: colors.text },
            headerStyle: { backgroundColor: colors.card },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="orders/[id]" options={{ title: "Order" }} />
          <Stack.Screen name="products/[id]" options={{ title: "Product" }} />
          <Stack.Screen name="categories" options={{ title: "Categories" }} />
          <Stack.Screen name="coupons" options={{ title: "Coupons" }} />
          <Stack.Screen name="inventory" options={{ title: "Inventory" }} />
          <Stack.Screen name="customers/index" options={{ title: "Customers" }} />
          <Stack.Screen name="customers/[id]" options={{ title: "Customer" }} />
          <Stack.Screen name="delivery" options={{ title: "Delivery partners" }} />
          <Stack.Screen name="settings" options={{ title: "Store settings" }} />
          <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
