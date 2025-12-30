import 'dotenv/config';

export default {
    expo: {
        name: "Memovox",
        slug: "memovox",
        version: "1.0.0",
        orientation: "portrait",
        icon: "./assets/icon.png",
        splash: {
            image: "./assets/splash.png",
            resizeMode: "contain",
            backgroundColor: "#ffffff"
        },
        ios: {
            bundleIdentifier: "com.memovox.app",
            supportsTabletMode: true,
            usesNonExemptEncryption: false,
            minimumOSVersion: "17.0",
            infoPlist: {
                NSContactsUsageDescription: "Memovox needs access to your contacts to let you invite friends to group planning sessions."
            }
        },
        android: {
            versionCode: 1,
            usesPermission: [
                "android.permission.RECORD_AUDIO",
                "android.permission.INTERNET",
                "android.permission.READ_CONTACTS"
            ],
            permissions: [
                "android.permission.RECORD_AUDIO",
                "android.permission.MODIFY_AUDIO_SETTINGS",
                "android.permission.READ_CONTACTS"
            ],
            adaptiveIcon: {
                foregroundImage: "./assets/icon.png",
                backgroundColor: "#ffffff"
            },
            package: "com.memovox.app",
            enableProguard: false,
            enableShrinkResources: false,
            softwareKeyboardLayoutMode: "pan",
            navigationBar: {
                visible: "sticky-immersive",
                barStyle: "light-content",
                backgroundColor: "#ffffff"
            }
        },
        jsEngine: "hermes",
        web: {},
        scheme: "memovox",
        plugins: [
            "expo-router",
            [
                "expo-av",
                {
                    "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone."
                }
            ],
            [
                "expo-navigation-bar",
                {
                    "position": "absolute",
                    "visibility": "visible",
                    "behavior": "overlay-swipe",
                    "backgroundColor": "#00000000"
                }
            ],
            [
                "expo-contacts",
                {
                    "contactsPermission": "Allow $(PRODUCT_NAME) to access your contacts to invite friends to group planning."
                }
            ],
            "expo-web-browser",
            "expo-font"
        ],
        extra: {
            eas: {
                projectId: "ce1f9f7a-de8f-42e5-85b5-347a9f0ae981"
            },
            supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
            supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
            groqApiKey: process.env.EXPO_PUBLIC_GROQ_API_KEY,
            googleClientIdAndroid: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
            googleClientIdIos: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
            googleClientIdWeb: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB
        },
        owner: "chinuchinu8"
    }
};
