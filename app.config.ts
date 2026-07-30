import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
  const realtimeUrl = process.env.EXPO_PUBLIC_REALTIME_URL ?? "";
  const mockMode = process.env.EXPO_PUBLIC_MOCK_MODE === "true";
  const buildProfile = process.env.EAS_BUILD_PROFILE;
  const isGithubPages = process.env.EXPO_PUBLIC_GITHUB_PAGES === "true";

  if (buildProfile === "production") {
    const missing = [
      !apiBaseUrl && "EXPO_PUBLIC_API_BASE_URL",
      !realtimeUrl && "EXPO_PUBLIC_REALTIME_URL",
      !easProjectId && "EXPO_PUBLIC_EAS_PROJECT_ID"
    ].filter(Boolean);
    if (mockMode) {
      throw new Error("EXPO_PUBLIC_MOCK_MODE doit être false en production.");
    }
    if (missing.length > 0) {
      throw new Error(
        `Configuration Connexio production incomplète : ${missing.join(", ")}`
      );
    }
    if (!apiBaseUrl.startsWith("https://")) {
      throw new Error("EXPO_PUBLIC_API_BASE_URL doit utiliser HTTPS en production.");
    }
    if (!realtimeUrl.startsWith("wss://")) {
      throw new Error("EXPO_PUBLIC_REALTIME_URL doit utiliser WSS en production.");
    }
  }

  return {
    ...config,
    name: "Connexio by Neptune",
    slug: "neptune-messenger-connexio",
    version: "0.2.0",
    orientation: "portrait",
    scheme: "neptuneconnexio",
    userInterfaceStyle: "automatic",
    web: {
      bundler: "metro",
      output: "single"
    },
    experiments: isGithubPages
      ? {
          baseUrl: "/Neptune-messenger-connexio"
        }
      : undefined,
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.neptunebusiness.connexio",
      infoPlist: {
        NSCameraUsageDescription:
          "Connexio utilise l’appareil photo uniquement lorsque vous choisissez d’envoyer une photo.",
        NSMicrophoneUsageDescription:
          "Connexio utilise le micro uniquement lorsque vous enregistrez un message vocal ou lancez un appel.",
        NSPhotoLibraryUsageDescription:
          "Connexio utilise votre photothèque uniquement pour joindre les médias que vous sélectionnez."
      }
    },
    android: {
      package: "com.neptunebusiness.connexio",
      adaptiveIcon: {
        backgroundColor: "#07162F"
      },
      permissions: ["POST_NOTIFICATIONS"]
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      [
        "expo-sqlite",
        {
          useSQLCipher: true,
          enableFTS: true
        }
      ],
      [
        "expo-notifications",
        {
          defaultChannel: "messages"
        }
      ]
    ],
    extra: {
      apiBaseUrl,
      realtimeUrl,
      mockMode,
      ...(easProjectId
        ? {
            eas: {
              projectId: easProjectId
            }
          }
        : {})
    }
  };
};
