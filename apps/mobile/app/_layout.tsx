import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "@/context/auth";
import { CartProvider } from "@/context/cart";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerTintColor: "#16a34a", headerTitleStyle: { color: "#0f172a" } }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false, presentation: "modal" }} />
            <Stack.Screen name="register" options={{ title: "Create account" }} />
            <Stack.Screen name="product/[slug]" options={{ title: "Product" }} />
            <Stack.Screen name="checkout" options={{ title: "Checkout" }} />
            <Stack.Screen name="orders/[id]" options={{ title: "Order" }} />
            <Stack.Screen name="addresses" options={{ title: "Addresses" }} />
          </Stack>
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
