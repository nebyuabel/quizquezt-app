// app/index.tsx
import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabaseClient";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { Ionicons } from "@expo/vector-icons";
import { useAppContext } from "@/context/ThemeContext";
// Add these imports at the top

// Set up WebBrowser to dismiss the auth session
WebBrowser.maybeCompleteAuthSession();
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Define the redirect URI for Google OAuth.
// In your index.tsx
const redirectUri = AuthSession.makeRedirectUri({
  scheme: "quizqueztappnew",
  path: "auth/callback", // Make sure this matches your callback route
});

const ACCENT_COLOR = "#4ade80";

export default function AuthScreen() {
  const { session, userProfile, loading } = useAppContext();
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  // ✅ REMOVED: useEffect that called scheduleDefaultReminders — now handled in AppProvider
  // Enhanced PWA install handler
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const handleBeforeInstallPrompt = (e: Event) => {
      console.log("✅ PWA install prompt available");
      e.preventDefault();

      // Cast to our interface
      const installEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(installEvent);
      setShowInstallPrompt(true);

      // Also store in window for backup
      (window as any).deferredPrompt = installEvent;
    };

    const handleAppInstalled = () => {
      console.log("✅ PWA was installed");
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      (window as any).deferredPrompt = null;
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Robust install handler
  const handleInstallClick = async () => {
    console.log("Install clicked, deferredPrompt:", !!deferredPrompt);

    // Try multiple ways to get the prompt
    let promptToUse = deferredPrompt || (window as any).deferredPrompt;

    if (!promptToUse) {
      console.log("No deferred prompt found, checking window...");
      // Check if there's a global deferredPrompt
      const globalPrompt = (window as any).deferredPrompt;
      if (globalPrompt && typeof globalPrompt.prompt === "function") {
        promptToUse = globalPrompt;
      } else {
        Alert.alert(
          "Install Not Available",
          "The install prompt is not available yet. Please wait a moment and try again."
        );
        return;
      }
    }

    if (promptToUse && typeof promptToUse.prompt === "function") {
      try {
        console.log("Triggering install prompt...");
        await promptToUse.prompt();
        const { outcome } = await promptToUse.userChoice;
        console.log(`User response: ${outcome}`);

        // Clear the prompt after use
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
        (window as any).deferredPrompt = null;
      } catch (error) {
        console.error("Error triggering install prompt:", error);
        Alert.alert(
          "Install Error",
          "Failed to trigger install prompt. Please try again."
        );
      }
    } else {
      console.error("Invalid deferred prompt:", promptToUse);
      Alert.alert("Install Error", "Install feature is not available.");
    }
  };
  const handleSignUp = async () => {
    try {
      if (email === "" || password === "" || username === "") {
        Alert.alert("Error", "All fields are required.");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            username: username,
          },
        },
      });

      if (error) throw error;

      Alert.alert(
        "Success",
        "Account created successfully! Please check your email to verify your account."
      );
      setIsRegistering(false);
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Error", error.message);
      }
    }
  };

  const handleLogin = async () => {
    try {
      if (email === "" || password === "") {
        Alert.alert("Error", "Email and password are required.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      // ✅ No need to call scheduleDefaultReminders here — handled in AppProvider after session is set
      router.replace("/(tabs)/home");
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Error", error.message);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Use openAuthSessionAsync for proper OAuth handling
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri
        );

        if (result.type === "success") {
          // Parse the URL to extract the session
          const url = result.url;
          const params = new URL(url).searchParams;
          const code = params.get("code");
          const accessToken = params.get("access_token");

          console.log(
            "Auth success, code or token present:",
            !!code || !!accessToken
          );

          // Explicitly exchange the code for a session
          if (code || accessToken) {
            try {
              const { data, error } =
                await supabase.auth.exchangeCodeForSession(
                  code || accessToken || ""
                );

              if (error) {
                console.error("Error exchanging code:", error);
                Alert.alert(
                  "Authentication Error",
                  "Failed to complete authentication"
                );
              } else if (data.session) {
                console.log("Session established:", data.session.user.email);
                router.replace("/(tabs)/home");
                return;
              }
            } catch (exchangeError) {
              console.error("Code exchange error:", exchangeError);
            }
          }

          // Fallback: check if we have a session after the redirect
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            router.replace("/(tabs)/home");
          }
        } else if (result.type === "cancel") {
          // User cancelled the OAuth flow
          console.log("Google OAuth cancelled");
        }
      }
    } catch (error) {
      console.error("Google auth error:", error);
      Alert.alert("Error", "Failed to sign in with Google");
    }
  };

  // If the user is already logged in, redirect them to the home screen.
  if (session) {
    router.replace("/(tabs)/home");
    return null;
  }

  // Show a loading indicator if the app is still loading
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-stone-950">
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  // Onboarding Screen

  // Auth Screen
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 justify-center items-center p-6 bg-stone-950"
    >
      <Ionicons
        name="log-in-outline"
        size={80}
        color={ACCENT_COLOR}
        className="mb-6"
      />
      <Text className="text-4xl font-extrabold text-center mb-8 text-white">
        {isRegistering ? "Create Account" : "Log In"}
      </Text>

      {isRegistering && (
        <TextInput
          className="p-4 rounded-lg mb-4 w-full text-lg border border-stone-700 bg-stone-900 text-white"
          placeholder="Username"
          placeholderTextColor="#78716c"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
      )}
      <TextInput
        className="p-4 rounded-lg mb-4 w-full text-lg border border-stone-700 bg-stone-900 text-white"
        placeholder="Email"
        placeholderTextColor="#78716c"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        className="p-4 rounded-lg mb-4 w-full text-lg border border-stone-700 bg-stone-900 text-white"
        placeholder="Password"
        placeholderTextColor="#78716c"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        className="p-4 rounded-lg items-center w-full mb-4 shadow-lg bg-[#4ade80]"
        onPress={isRegistering ? handleSignUp : handleLogin}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white text-xl font-bold">
            {isRegistering ? "Sign Up" : "Log In"}
          </Text>
        )}
      </TouchableOpacity>

      {/* Google Sign-In Button */}
      <TouchableOpacity
        className="p-4 rounded-lg items-center w-full mb-4 shadow-lg flex-row justify-center border border-stone-700 bg-stone-900"
        onPress={handleGoogleSignIn}
      >
        <Ionicons name="logo-google" size={24} color="#ffffff" />
        <Text className="text-xl font-bold ml-2 text-white">
          Sign in with Google
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setIsRegistering(!isRegistering)}
        className="mt-4"
      >
        <Text className="text-base text-stone-400">
          {isRegistering
            ? "Already have an account? Log In"
            : "Don't have an account? Sign Up"}
        </Text>
      </TouchableOpacity>
      {/* PWA Install Prompt */}
      {showInstallPrompt && (
        <View className="mt-6 p-4 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg w-full shadow-lg">
          <Text className="text-white text-lg font-bold text-center mb-2">
            📱 Install QuizQuezt App
          </Text>
          <Text className="text-white text-center mb-3 opacity-90">
            Get the full app experience with offline access!
          </Text>
          <View className="flex-row space-x-3">
            <TouchableOpacity
              onPress={handleInstallClick}
              className="flex-1 bg-white py-3 rounded-lg shadow"
            >
              <Text className="text-green-600 text-center font-bold text-lg">
                Install Now
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowInstallPrompt(false)}
              className="px-4 py-3 rounded-lg border border-white"
            >
              <Text className="text-white text-center font-bold">Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
