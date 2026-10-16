import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

import { API_BASE_URL } from "./src/lib/api";

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Text style={styles.title}>Fresh Basket</Text>
        <Text style={styles.subtitle}>Mobile app scaffold</Text>
        <Text style={styles.muted}>API: {API_BASE_URL}</Text>
        <Text style={styles.muted}>
          Customer flows (browse, cart, checkout, orders, push) arrive in milestone M5.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 24 },
  title: { fontSize: 28, fontWeight: "700", color: "#16a34a" },
  subtitle: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  muted: { fontSize: 13, color: "#64748b", textAlign: "center" },
});
