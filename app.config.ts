import type { ConfigContext, ExpoConfig } from "expo/config";

const APP_VERSION = "1.0.0";
const NOTIFICATION_SOUND = "./assets/audio/connexio-notification.mp3";

function requireHttps(name: string, value: string): void {
  if (!value.startsWith("https://")) {
    throw new Error(`${name} doit utiliser HTTPS en production.`);
  }
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? "";
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
  const realtimeUrl = process.env.EXPO_PUBLIC_REALTIME_URL ?? "";
  const businessWebBaseUrl =
    process.env.EXPO_PUBLIC_BUSINESS_WEB_BASE_URL ??
    "https://neptunebusiness.com";
  const privacyPolicyUrl = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? "";
  const accountDeletionUrl =
    process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL ?? "";
  const supportUrl =
    process.env.EXPO_PUBLIC_SUPPORT_URL ??
    "mailto:contact@neptunebusiness.com";
  const mockMode = process.env.EXPO_PUBLIC_MOCK_MODE === "true";
  const buildProfile = process.env.EAS_BUILD_PROFILE ?? "development";
  const isProduction = buildProfile === "production";
  const isReleaseCandidate = buildProfile === "release-candidate";
  const isStoreBuild = isProduction || isReleaseCandidate;
  const isGithubPages = process.env.EXPO_PUBLIC_GITHUB_PAGES === "true";

  if (isStoreBuild) {
    const missing = [
      !apiBaseUrl && "EXPO_PUBLIC_API_BASE_URL",
      !realtimeUrl && "EXPO_PUBLIC_REALTIME_URL",
      !easProjectId && "EXPO_PUBLIC_EAS_PROJECT_ID",
      !privacyPolicyUrl && "EXPO_PUBLIC_PRIVACY_POLICY_URL",
      !accountDeletionUrl && "EXPO_PUBLIC_ACCOUNT_DELETION_URL"
    ].filter(Boolean);
    if (mockMode) {
      throw new Error("EXPO_PUBLIC_MOCK_MODE doit être false pour une build store.");
    }
    if (missing.length > 0) {
      throw new Error(
        `Configuration Connexio store incomplète : ${missing.join(", ")}`
      );
    }
    requireHttps("EXPO_PUBLIC_API_BASE_URL", apiBaseUrl);
    if (!realtimeUrl.startsWith("wss://") && !realtimeUrl.startsWith("https://")) {
      throw new Error(
        "EXPO_PUBLIC_REALTIME_URL doit utiliser WSS ou HTTPS pour une build store."
      );
    }
    requireHttps("EXPO_PUBLIC_BUSINESS_WEB_BASE_URL", businessWebBaseUrl);
    requireHttps("EXPO_PUBLIC_PRIVACY_POLICY_URL", privacyPolicyUrl);
    requireHttps("EXPO_PUBLIC_ACCOUNT_DELETION_URL", accountDeletionUrl);
  }

  return {
    ...config,
    name: "Connexio by Neptune",
    slug: "neptune-messenger-connexio",
    version: APP_VERSION,
    orientation: "default",
    scheme: "neptuneconnexio",
    userInterfaceStyle: "dark",
    backgroundColor: "#020713",
    icon: "./assets/icon.png",
    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/favicon.png"
    },
    experiments: isGithubPages
      ? {
          baseUrl: "/Neptune-messenger-connexio"
        }
      : undefined,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.neptunebusiness.connexio",
      icon: "./assets/icon.png",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription:
          "Connexio utilise la caméra lorsque vous choisissez de prendre une photo, publier une vidéo ou participer à un appel vidéo.",
        NSMicrophoneUsageDescription:
          "Connexio utilise le microphone lorsque vous enregistrez un message vocal, dictez l’objet d’un appel ou participez à un appel.",
        NSSpeechRecognitionUsageDescription:
          "Connexio transcrit uniquement l’objet d’appel que vous choisissez explicitement de dicter.",
        NSPhotoLibraryUsageDescription:
          "Connexio accède uniquement aux photos et vidéos que vous choisissez de partager.",
        NSLocationWhenInUseUsageDescription:
          "Connexio utilise votre position uniquement à votre demande pour la carte ou le partage d’un lieu."
      },
      privacyManifests: {
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType:
              "NSPrivacyAccessedAPICategoryUserDefaults",
            NSPrivacyAccessedAPITypeReasons: ["CA92.1"]
          },
          {
            NSPrivacyAccessedAPIType:
              "NSPrivacyAccessedAPICategorySystemBootTime",
            NSPrivacyAccessedAPITypeReasons: ["35F9.1"]
          },
          {
            NSPrivacyAccessedAPIType:
              "NSPrivacyAccessedAPICategoryFileTimestamp",
            NSPrivacyAccessedAPITypeReasons: ["C617.1"]
          },
          {
            NSPrivacyAccessedAPIType:
              "NSPrivacyAccessedAPICategoryDiskSpace",
            NSPrivacyAccessedAPITypeReasons: ["E174.1"]
          }
        ]
      }
    },
    android: {
      package: "com.neptunebusiness.connexio",
      icon: "./assets/icon.png",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#020713"
      },
      softwareKeyboardLayoutMode: "resize",
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
      [
        "expo-splash-screen",
        {
          image: "./assets/splash-icon.png",
          imageWidth: 220,
          resizeMode: "contain",
          backgroundColor: "#020713",
          dark: {
            image: "./assets/splash-icon.png",
            backgroundColor: "#020713"
          }
        }
      ],
      "expo-audio",
      [
        "expo-speech-recognition",
        {
          microphonePermission:
            "Connexio utilise le microphone uniquement lorsque vous choisissez de dicter l’objet d’un appel.",
          speechRecognitionPermission:
            "Connexio transcrit uniquement l’objet d’appel que vous choisissez explicitement de dicter.",
          androidSpeechServicePackages: [
            "com.google.android.googlequicksearchbox",
            "com.google.android.as"
          ]
        }
      ],
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
          defaultChannel: "messages",
          icon: "./assets/notification-icon.png",
          color: "#0048BA",
          sounds: [NOTIFICATION_SOUND]
        }
      ],
      [
        "expo-image-picker",
        {
          photosPermission:
            "Connexio accède uniquement aux photos et vidéos que vous choisissez de partager.",
          cameraPermission:
            "Connexio utilise la caméra lorsque vous choisissez de créer un contenu.",
          microphonePermission:
            "Connexio utilise le microphone uniquement lors d’un enregistrement vidéo choisi."
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
      businessWebBaseUrl,
      privacyPolicyUrl,
      accountDeletionUrl,
      supportUrl,
      mockMode,
      buildProfile,
      releaseStage: isProduction
        ? "production"
        : isReleaseCandidate
          ? "release-candidate"
          : buildProfile === "preview"
            ? "preview"
            : "development",
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
