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
  return null;
}
