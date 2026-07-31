import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
  const realtimeUrl = process.env.EXPO_PUBLIC_REALTIME_URL ?? "";
  const callBaseUrl =
    process.env.EXPO_PUBLIC_CALL_BASE_URL ?? "https://meet.jit.si";
  const mockMode = process.env.EXPO_PUBLIC_MOCK_MODE === "true";
  const buildProfile = process.env.EAS_BUILD_PROFILE ?? "development";
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
    if (!callBaseUrl.startsWith("https://")) {
      throw new Error("EXPO_PUBLIC_CALL_BASE_URL doit utiliser HTTPS en production.");
    }
  }

  return {
    ...config,
    name: "Connexio by Neptune",
    slug: "neptune-messenger-connexio",
    version: "0.3.0",
    orientation: "portrait",
    scheme: "neptuneconnexio",
    userInterfaceStyle: "dark",
    backgroundColor: "#020713",
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
      supportsTablet: true,
      bundleIdentifier: "com.neptunebusiness.connexio",
      infoPlist: {
        NSCameraUsageDescription:
          "Connexio utilise la caméra pour envoyer des photos, publier des vidéos et participer aux appels vidéo.",
        NSMicrophoneUsageDescription:
          "Connexio utilise le microphone pour les messages audio et les appels.",
        NSPhotoLibraryUsageDescription:
          "Connexio accède à vos médias uniquement lorsque vous choisissez un contenu à partager.",
        NSLocationWhenInUseUsageDescription:
          "Connexio utilise votre position pour vous localiser sur la carte et partager un lieu à votre demande."
      }
    },
    android: {
      package: "com.neptunebusiness.connexio",
      adaptiveIcon: {
        backgroundColor: "#020713"
      },
      permissions: [
        "POST_NOTIFICATIONS",
        "CAMERA",
        "RECORD_AUDIO",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION"
      ]
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      [
        "expo-sqlite",
        {
          useSQLCipher: true
        }
      ],
      [
        "expo-notifications",
        {
          defaultChannel: "messages"
        }
      ],
      [
        "expo-image-picker",
        {
          photosPermission:
            "Connexio accède aux photos et vidéos que vous choisissez de partager.",
          cameraPermission:
            "Connexio utilise la caméra pour créer un contenu à partager.",
          microphonePermission:
            "Connexio utilise le microphone lors de l’enregistrement vidéo."
        }
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "Connexio utilise votre position uniquement à votre demande."
        }
      ],
      "expo-document-picker"
    ],
    extra: {
      apiBaseUrl,
      realtimeUrl,
      callBaseUrl,
      mockMode,
      buildProfile,
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
