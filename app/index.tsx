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

// Set up WebBrowser to dismiss the auth session
WebBrowser.maybeCompleteAuthSession();

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

  // ✅ REMOVED: useEffect that called scheduleDefaultReminders — now handled in AppProvider

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
          skipBrowserRedirect: true, // Make sure this is true
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

          // Check if we have an access token in the URL
          if (params.get("access_token") || params.get("code")) {
            // The session should be automatically handled by Supabase
            // Wait a moment for the session to be set
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
  if (session && userProfile) {
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
  if (showOnboarding) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center p-6 bg-stone-950">
        <View className="w-full max-w-sm mx-auto mb-8">
          <View className="aspect-[1/1] w-full overflow-hidden rounded-2xl">
            <View className="w-full h-full bg-stone-800 flex items-center justify-center">
              <Ionicons name="school-outline" size={150} color={ACCENT_COLOR} />
            </View>
          </View>
        </View>
        <Text className="text-4xl font-extrabold text-center mb-2 text-white">
          QuizQuest
        </Text>
        <Text className="text-lg text-center mb-8 text-stone-400">
          Your personal learning assistant for grades 9-12. Dive into custom
          notes, flashcards, and quizzes to ace any subject.
        </Text>

        <TouchableOpacity
          className="w-full p-4 rounded-lg items-center mb-4 shadow-lg bg-[#4ade80]"
          onPress={() => setShowOnboarding(false)}
        >
          <Text className="text-white text-xl font-bold">Get Started</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

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
    </KeyboardAvoidingView>
  );
}
