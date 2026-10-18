import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { api } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Request permission and register the device's Expo push token with the API. */
export async function registerForPush(): Promise<void> {
  try {
    if (!Device.isDevice) return;
    let { granted } = await Notifications.getPermissionsAsync();
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted;
    }
    if (!granted) return;

    const token = await Notifications.getExpoPushTokenAsync();
    await api.registerDevice(token.data, Platform.OS === "ios" ? "ios" : "android");
  } catch {
    // Push registration is best-effort.
  }
}
