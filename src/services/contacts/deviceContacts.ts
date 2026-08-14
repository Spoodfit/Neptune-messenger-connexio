import { Contact } from "expo-contacts";
import { Platform, Share } from "react-native";

import type { AppUser } from "../../types/messaging";

export interface PickedDeviceContact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

export async function pickDeviceContact(): Promise<PickedDeviceContact | null> {
  if (Platform.OS === "web") return null;
  const contact = await Contact.presentPicker();
  if (!contact) return null;
  const [name, phones, emails] = await Promise.all([
    contact.getFullName(),
    contact.getPhones(),
    contact.getEmails()
  ]);
  const phone = phones.find((item) => item.number?.trim())?.number?.trim();
  const email = emails.find((item) => item.address?.trim())?.address?.trim();
  return {
    id: contact.id,
    name: name.trim() || phone || email || "Contact",
    phone,
    email
  };
}

export async function shareConnexioInvite(contact?: PickedDeviceContact): Promise<void> {
  const recipient = contact?.name ? ` pour ${contact.name}` : "";
  await Share.share({
    title: "Découvrir Connexio by Neptune",
    message: `Invitation${recipient} : rejoins-moi sur Connexio by Neptune pour échanger avec le réseau Neptune. https://neptunebusiness.com`
  });
}

export async function shareMemberRecommendation(
  member: AppUser,
  contact?: PickedDeviceContact
): Promise<void> {
  const recipient = contact?.name ? ` à ${contact.name}` : "";
  const profile = member.webProfileUrl ? `\n${member.webProfileUrl}` : "";
  await Share.share({
    title: `Je te recommande ${member.name}`,
    message: `Je te recommande${recipient} ${member.name} · ${member.company} (${member.city}) sur Connexio by Neptune.${profile}`
  });
}

export async function shareAppointmentInvite(input: {
  participantName: string;
  subject: string;
  scheduledAt: string;
  contact?: PickedDeviceContact;
}): Promise<void> {
  const when = new Date(input.scheduledAt).toLocaleString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
  const recipient = input.contact?.name ? `\nInvité : ${input.contact.name}` : "";
  await Share.share({
    title: `Rendez-vous Connexio · ${input.subject}`,
    message: `Rendez-vous Connexio avec ${input.participantName}\n${when}\nObjet : ${input.subject}${recipient}\nOuvre Connexio by Neptune pour retrouver le rendez-vous.`
  });
}
