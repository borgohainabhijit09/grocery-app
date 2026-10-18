import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius } from "@/theme";

export function QuantityStepper({
  quantity,
  onIncrement,
  onDecrement,
  disabled,
}: {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      <Pressable
        style={[styles.btn, disabled && styles.disabled]}
        onPress={onDecrement}
        disabled={disabled}
      >
        <Text style={styles.btnText}>−</Text>
      </Pressable>
      <Text style={styles.qty}>{quantity}</Text>
      <Pressable
        style={[styles.btn, disabled && styles.disabled]}
        onPress={onIncrement}
        disabled={disabled}
      >
        <Text style={styles.btnText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  btn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  btnText: { color: colors.primary, fontSize: 18, fontWeight: "700" },
  qty: {
    minWidth: 30,
    textAlign: "center",
    fontWeight: "700",
    color: colors.text,
    fontSize: 15,
  },
  disabled: { opacity: 0.4 },
});
