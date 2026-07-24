import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  const isGithubPages = process.env.EXPO_PUBLIC_GITHUB_PAGES === "true";

  return {
    ...config,
    name: "Connexio by Neptune",
    slug: "neptune-messenger-connexio",
    version: "0.1.0",
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
          "Connexio utilise l’appareil photo pour envoyer des photos dans les conversations.",
        NSMicrophoneUsageDescription:
          "Connexio utilise le micro pour les futurs messages vocaux.",
        NSPhotoLibraryUsageDescription:
          "Connexio utilise votre photothèque pour joindre des images."
      }
    },
    android: {
      package: "com.neptunebusiness.connexio",
      adaptiveIcon: {
        backgroundColor: "#07162F"
      }
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      [
        "expo-notifications",
        {
          defaultChannel: "messages"
        }
      ]
    ],
    extra: {
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
      realtimeUrl: process.env.EXPO_PUBLIC_REALTIME_URL ?? "",
      mockMode: process.env.EXPO_PUBLIC_MOCK_MODE !== "false",
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