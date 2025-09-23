// app/notes/note-details.tsx
import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabaseClient";
import { useAppContext } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import * as ScreenCapture from "expo-screen-capture";

// --- INTERFACES ---
interface Note {
  id: string;
  title: string;
  content: string;
  grade: string;
  subject: string;
  unit: string;
  is_premium: boolean;
  created_at: string;
}

const PRIMARY_COLOR = "#38e07b";

export default function NoteDetailsScreen() {
  const { darkMode } = useAppContext();
  const { noteId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<Note | null>(null);

  // ❌ Removed: screenshotDetected state — not needed since we can't detect on Android

  // ✅ Cleanup function to allow screenshots
  const cleanupScreenCapture = async () => {
    if (Platform.OS === "ios") {
      try {
        // Try multiple times if needed
        for (let i = 0; i < 3; i++) {
          await ScreenCapture.allowScreenCaptureAsync();
          await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay
        }
        console.log("✅ Screen capture allowed successfully");
      } catch (error) {
        console.warn("⚠️ Failed to allow screen capture:", error);
      }
    }
  };

  // Prevent screenshots on mount (iOS only)
  useEffect(() => {
    const setupScreenProtection = async () => {
      if (Platform.OS === "ios") {
        try {
          await ScreenCapture.preventScreenCaptureAsync();
          console.log("🔒 Screen capture prevented on iOS");
        } catch (error) {
          console.warn("⚠️ Failed to prevent screen capture:", error);
        }
      }
      // ❌ Android: We do nothing — can't detect or prevent screenshots
    };

    setupScreenProtection();

    // ✅ SAFETY CLEANUP on unmount
    return () => {
      cleanupScreenCapture();
    };
  }, []);

  // ✅ EXTRA SAFETY: Cleanup when screen loses focus
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        cleanupScreenCapture();
      };
    }, [])
  );

  useEffect(() => {
    const fetchNote = async () => {
      if (!noteId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("notes")
          .select("*")
          .eq("id", noteId)
          .single();

        if (error) throw error;

        setNote(data as Note);
      } catch (error: any) {
        console.error("NoteDetailsScreen: Error fetching note:", error);
        Alert.alert("Error", `Failed to load note: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchNote();
  }, [noteId]);

  if (loading) {
    return (
      <SafeAreaView
        className={`flex-1 justify-center items-center ${
          darkMode ? "bg-stone-950" : "bg-white"
        }`}
      >
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text
          className={`mt-4 ${darkMode ? "text-stone-300" : "text-stone-700"}`}
        >
          Loading Note...
        </Text>
      </SafeAreaView>
    );
  }

  if (!note) {
    return (
      <SafeAreaView
        className={`flex-1 justify-center items-center ${
          darkMode ? "bg-stone-950" : "bg-white"
        }`}
      >
        <Text
          className={`text-lg font-bold ${
            darkMode ? "text-white" : "text-black"
          }`}
        >
          Note not found.
        </Text>
      </SafeAreaView>
    );
  }

  // ❌ Removed: renderContent() with screenshot logic — not needed
  // We just render the note content normally

  return (
    <SafeAreaView
      className={`flex-1 ${darkMode ? "bg-stone-950" : "bg-white"}`}
    >
      {/* Header */}
      <View
        className={`flex-row justify-between items-center p-4 sticky top-0 z-10 ${
          darkMode
            ? "bg-stone-950/80 border-b border-stone-800"
            : "bg-white/80 border-b border-stone-200"
        } backdrop-blur-sm`}
      >
        <TouchableOpacity
          onPress={async () => {
            await cleanupScreenCapture(); // ✅ Clean up BEFORE navigating back
            router.back();
          }}
          className="p-2"
        >
          <Ionicons
            name="arrow-back-outline"
            size={24}
            color={darkMode ? "white" : "black"}
          />
        </TouchableOpacity>
        <Text
          className={`text-xl font-bold flex-1 text-center ${
            darkMode ? "text-white" : "text-black"
          }`}
        >
          {note.subject} Note
        </Text>
        <View className="w-8" />
      </View>

      <ScrollView className="flex-1 px-6 pt-4 pb-6">
        <View className="pt-4 pb-2">
          <Text
            className={`text-3xl font-bold leading-tight tracking-tight ${
              darkMode ? "text-white" : "text-black"
            }`}
          >
            {note.title}
          </Text>
          <Text
            className={`text-sm font-normal pt-2 ${
              darkMode ? "text-stone-400" : "text-stone-500"
            }`}
          >
            Created on {new Date(note.created_at).toLocaleDateString()}
          </Text>
        </View>

        <View
          className={`text-base font-normal leading-relaxed space-y-6 ${
            darkMode ? "text-stone-300" : "text-stone-700"
          }`}
        >
          <Text>{note.content}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
