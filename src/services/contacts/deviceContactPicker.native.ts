import { Contact } from "expo-contacts";

import type { SelectedDeviceContact } from "../../types/deviceContacts";

export async function pickDeviceContact(): Promise<SelectedDeviceContact | null> {
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
