import "../global.css";
import React, { useState, useEffect } from "react";
import { ActivityIndicator, View, Platform } from "react-native";
import { Stack, router } from "expo-router";
import * as Notifications from "expo-notifications";
import { supabase } from "@/lib/supabaseClient"; // Using relative path for root layout
import { AppProvider } from "@/context/ThemeContext"; // Using relative path for root layout

// Properly type the notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const setupNotifications = async (userId: string) => {
      try {
        // Skip on web
        if (Platform.OS === "web") return;

        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") return;

        const token = (await Notifications.getExpoPushTokenAsync()).data;
        await supabase
          .from("settings")
          .upsert({ user_id: userId, expo_push_token: token });
      } catch (error) {
        console.error("Notification setup error:", error);
      }
    };
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: string, session: any) => {
        if (session?.user) {
          await setupNotifications(session.user.id);
        }
        setSession(session);
        setLoading(false);
      }
    );

    return () => authListener.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-900">
        <ActivityIndicator size="large" color="#a78bfa" />
      </View>
    );
  }

  return (
    <AppProvider>
      <Stack>
        {/* The main authentication screen */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        {/* The (tabs) group which contains your tabbed navigation */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/*
          Other screens not part of tabs, but still in the main stack.
          These will be accessible via router.push() from tab screens.
          Note: quiz-play is navigated to from the home screen's quiz section.
          profile, settings, store are accessed from icons on the home screen.
        */}
        <Stack.Screen name="quiz-play" options={{ headerShown: false }} />
        <Stack.Screen name="flashcard-play" options={{ headerShown: false }} />
        <Stack.Screen
          name="notes/note-details"
          options={{ headerShown: false }}
        />
      </Stack>
    </AppProvider>
  );
}
