import { Contact, requestPermissionsAsync } from "expo-contacts";
import { Platform } from "react-native";

import type { SelectedDeviceContact } from "../../types/deviceContacts";

export class DeviceContactPermissionError extends Error {
  readonly canAskAgain: boolean;

  constructor(canAskAgain: boolean) {
    super("CONTACTS_PERMISSION_DENIED");
    this.name = "DeviceContactPermissionError";
    this.canAskAgain = canAskAgain;
  }
}

export async function pickDeviceContact(): Promise<SelectedDeviceContact | null> {
  if (Platform.OS === "web") return null;

  if (Platform.OS === "android") {
    const permission = await requestPermissionsAsync();
    if (!permission.granted) throw new DeviceContactPermissionError(permission.canAskAgain);
  }

  const contact = await Contact.presentPicker();
  if (!contact) return null;

  const [displayName, phones, emails] = await Promise.all([
    contact.getFullName(),
    contact.getPhones(),
    contact.getEmails()
  ]);

  const phone = phones.find((item) => item.number?.trim())?.number?.trim();
  const email = emails.find((item) => item.address?.trim())?.address?.trim();
  return {
    id: contact.id,
    displayName: displayName.trim() || phone || email || "Contact",
    ...(phone ? { phone } : {}),
    ...(email ? { email } : {})
  };
}
