import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabaseClient";
import { useAppContext } from "@/context/ThemeContext"; // Use useAppContext
import { Ionicons } from "@expo/vector-icons";
import { User } from "@supabase/supabase-js";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

interface UserProfile {
  id: string;
  username: string | null;
  is_premium: boolean;
}

// Define subject icons
const SUBJECT_ICONS: { [key: string]: string } = {
  Math: "calculator-outline",
  Science: "flask-outline",
  History: "globe-outline",
  English: "book-outline",
  Physics: "flash-outline",
  Chemistry: "beaker-outline",
  Biology: "leaf-outline",
  "Computer Science": "code-slash-outline",
};

// Hardcoded lists for selection
const ALL_GRADES = ["Grade 9", "Grade 10", "Grade 11", "Grade 12"];
const ALL_SUBJECTS = [
  { name: "Math", icon: "calculator-outline" },
  { name: "Physics", icon: "flash-outline" },
  { name: "Chemistry", icon: "beaker-outline" },
  { name: "Biology", icon: "leaf-outline" },
  { name: "Literature", icon: "book-outline" },
  { name: "SAT", icon: "document-text-outline" },
  { name: "History", icon: "globe-outline" },
  { name: "Geography", icon: "earth-outline" },
  { name: "Economics", icon: "stats-chart-outline" },
];

const PRIMARY_COLOR = "#38e07b";

export default function NotesScreen() {
  const { darkMode } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [availableUnits, setAvailableUnits] = useState<string[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  const [isSelectionModalVisible, setIsSelectionModalVisible] = useState(false);
  const [modalSelectedGrade, setModalSelectedGrade] = useState<string | null>(
    null
  );
  const [modalSelectedSubject, setModalSelectedSubject] = useState<
    string | null
  >(null);

  // --- Initial Load & User Profile ---
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) {
          router.replace("/");
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, username, is_premium")
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;
        setUserProfile(profileData as UserProfile);

        // Fetch initial notes if a grade/subject is pre-selected
        if (selectedGrade && selectedSubject) {
          await fetchUnitsAndNotes();
        }
      } catch (error: any) {
        console.error("NotesScreen: Initialization error:", error);
        Alert.alert("Error", `Failed to load user data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  // --- Fetch Units and Notes based on Selected Grade and Subject ---
  const fetchUnitsAndNotes = async () => {
    if (!selectedGrade || !selectedSubject) {
      setAvailableUnits([]);
      setNotes([]);
      return;
    }
    setLoading(true);
    try {
      const { data: unitsData, error: unitsError } = await supabase
        .from("notes")
        .select("unit", { distinct: true })
        .eq("grade", selectedGrade)
        .eq("subject", selectedSubject)
        .order("unit", { ascending: true });

      if (unitsError) throw unitsError;
      const fetchedUnits = Array.from(
        new Set(unitsData.map((u: { unit: string }) => u.unit?.trim()))
      ).filter(Boolean);
      setAvailableUnits(fetchedUnits);

      const { data: notesData, error: notesError } = await supabase
        .from("notes")
        .select("*")
        .eq("grade", selectedGrade)
        .eq("subject", selectedSubject)
        .order("created_at", { ascending: true });

      if (notesError) throw notesError;
      setNotes(notesData as Note[]);
    } catch (error: any) {
      console.error("NotesScreen: Error fetching units or notes:", error);
      Alert.alert("Error", `Failed to load units/notes: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnitsAndNotes();
  }, [selectedGrade, selectedSubject]);

  const confirmSelection = () => {
    setSelectedGrade(modalSelectedGrade);
    setSelectedSubject(modalSelectedSubject);
    setIsSelectionModalVisible(false);
  };

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
          Loading Notes...
        </Text>
      </SafeAreaView>
    );
  }
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView
      className={`flex-1 ${darkMode ? "bg-stone-950" : "bg-white"}`}
      style={{
        flex: 1,
        // Critical for Android - prevents content from going under navigation bar
        paddingBottom: Platform.OS === "android" ? insets.bottom : 0,
      }}
    >
      {/* Header */}
      <View
        className={`flex-row justify-between items-center p-4 border-b ${
          darkMode
            ? "border-stone-800 bg-stone-950"
            : "border-stone-200 bg-white"
        }`}
      >
        <TouchableOpacity onPress={() => router.back()} className="p-2">
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
          Notes
        </Text>
        <TouchableOpacity
          onPress={() => setIsSelectionModalVisible(true)}
          className="p-2"
        >
          <Ionicons
            name="options-outline"
            size={24}
            color={darkMode ? "white" : "black"}
          />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        <Text
          className={`text-2xl font-bold mb-4 ${
            darkMode ? "text-white" : "text-black"
          }`}
        >
          Notes
        </Text>
        <Text
          className={`text-base font-bold mb-4 ${
            darkMode ? "text-white" : "text-black"
          }`}
        >
          {selectedGrade && selectedSubject
            ? `${selectedGrade} - ${selectedSubject}`
            : "Please select a Grade and Subject"}
        </Text>

        {selectedGrade && selectedSubject ? (
          <View className="space-y-3">
            {notes.length > 0 ? (
              notes.map((note) => (
                <TouchableOpacity
                  key={note.id}
                  onPress={() => {
                    // Navigate to individual note screen
                    router.push({
                      pathname: "notes/note-details",
                      params: { noteId: note.id },
                    });
                  }}
                  className={`flex-row items-center gap-4 p-3 rounded-xl ${
                    darkMode ? "bg-stone-900" : "bg-stone-100"
                  }`}
                >
                  <View
                    className="text-white flex items-center justify-center rounded-lg shrink-0 size-12"
                    style={{ backgroundColor: PRIMARY_COLOR }}
                  >
                    <Ionicons
                      name={SUBJECT_ICONS[note.subject] as any}
                      size={24}
                      color="black"
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`text-base font-medium ${
                        darkMode ? "text-white" : "text-black"
                      }`}
                    >
                      {note.title}
                    </Text>
                    <Text
                      className={`text-sm ${
                        darkMode ? "text-stone-400" : "text-stone-500"
                      }`}
                    >
                      {note.subject}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward-outline"
                    size={20}
                    color={darkMode ? "#a1a1aa" : "#44403c"}
                  />
                  {note.is_premium && !userProfile?.is_premium && (
                    <View className="absolute top-2 right-12 bg-yellow-400 px-2 py-1 rounded-full">
                      <Text className="text-xs font-bold text-black">
                        Premium
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View
                className={`items-center p-5 rounded-lg ${
                  darkMode ? "bg-stone-900" : "bg-stone-100"
                }`}
              >
                <Text
                  className={`text-lg text-center mb-4 ${
                    darkMode ? "text-stone-300" : "text-stone-700"
                  }`}
                >
                  No notes found for this selection yet.
                </Text>
                <Ionicons
                  name="file-tray-outline"
                  size={48}
                  color={darkMode ? "#a1a1aa" : "#44403c"}
                />
              </View>
            )}
          </View>
        ) : (
          <View
            className={`items-center p-5 rounded-lg ${
              darkMode ? "bg-stone-900" : "bg-stone-100"
            }`}
          >
            <Text
              className={`text-lg text-center mb-4 ${
                darkMode ? "text-stone-300" : "text-stone-700"
              }`}
            >
              Please use the options button in the header to select a Grade and
              Subject.
            </Text>
            <Ionicons
              name="options-outline"
              size={48}
              color={darkMode ? "#a1a1aa" : "#44403c"}
            />
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button - Replaced with the bottom sheet modal */}
      {/* <TouchableOpacity
        className="absolute bottom-6 right-6 flex-row items-center justify-center h-16 w-16 rounded-full shadow-lg"
        style={{ backgroundColor: PRIMARY_COLOR }}
        onPress={() => setIsSelectionModalVisible(true)}
      >
        <Ionicons name="add" size={32} color="black" />
      </TouchableOpacity> */}

      {/* Selection Bottom Sheet Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isSelectionModalVisible}
        onRequestClose={() => setIsSelectionModalVisible(false)}
      >
        <TouchableWithoutFeedback
          onPress={() => setIsSelectionModalVisible(false)}
        >
          <View className="flex-1 justify-end bg-black/50">
            <TouchableWithoutFeedback>
              <View
                className={`w-full ${
                  darkMode ? "bg-stone-900" : "bg-white"
                } rounded-t-3xl p-6 shadow-lg`}
                style={{ maxHeight: Dimensions.get("window").height * 0.7 }}
              >
                {/* Modal Title and Close Button */}
                <View className="flex-row justify-between items-center mb-6">
                  <Text
                    className={`text-2xl font-bold flex-1 text-center ${
                      darkMode ? "text-white" : "text-black"
                    }`}
                  >
                    Select Options
                  </Text>
                  <TouchableOpacity
                    onPress={() => setIsSelectionModalVisible(false)}
                    className="p-1 rounded-full"
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={32}
                      color={darkMode ? "white" : "black"}
                    />
                  </TouchableOpacity>
                </View>

                {/* Grade Selection */}
                <Text
                  className={`text-lg font-bold mb-3 ${
                    darkMode ? "text-white" : "text-black"
                  }`}
                >
                  Grade:
                </Text>
                <ScrollView horizontal className="mb-6">
                  {ALL_GRADES.map((gradeOption) => (
                    <TouchableOpacity
                      key={gradeOption}
                      className={`p-3 rounded-xl mr-2 ${
                        modalSelectedGrade === gradeOption
                          ? `border-2 border-[${PRIMARY_COLOR}]`
                          : "border-2 border-transparent"
                      } ${darkMode ? "bg-stone-800" : "bg-stone-200"}`}
                      onPress={() => setModalSelectedGrade(gradeOption)}
                    >
                      <Text
                        className={
                          darkMode
                            ? "text-white text-base"
                            : "text-black text-base"
                        }
                      >
                        {gradeOption}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Subject Selection */}
                <Text
                  className={`text-lg font-bold mb-3 ${
                    darkMode ? "text-white" : "text-black"
                  }`}
                >
                  Subject:
                </Text>
                <ScrollView
                  className="mb-6"
                  style={{ maxHeight: Dimensions.get("window").height * 0.3 }}
                >
                  <View className="flex-row flex-wrap">
                    {ALL_SUBJECTS.map((subjectOption) => (
                      <TouchableOpacity
                        key={subjectOption.name}
                        className={`p-3 rounded-xl mr-2 mb-2 flex-row items-center ${
                          modalSelectedSubject === subjectOption.name
                            ? `border-2 border-[${PRIMARY_COLOR}]`
                            : "border-2 border-transparent"
                        } ${darkMode ? "bg-stone-800" : "bg-stone-200"}`}
                        onPress={() =>
                          setModalSelectedSubject(subjectOption.name)
                        }
                      >
                        <Ionicons
                          name={subjectOption.icon as any}
                          size={20}
                          color={darkMode ? PRIMARY_COLOR : "#000"}
                          className="mr-2"
                        />
                        <Text
                          className={
                            darkMode
                              ? "text-white text-base"
                              : "text-black text-base"
                          }
                        >
                          {subjectOption.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                {/* Confirm Button */}
                <TouchableOpacity
                  className={`p-4 rounded-xl items-center ${
                    !modalSelectedGrade || !modalSelectedSubject
                      ? darkMode
                        ? "bg-stone-700"
                        : "bg-stone-400"
                      : "bg-green-500"
                  }`}
                  onPress={confirmSelection}
                  disabled={!modalSelectedGrade || !modalSelectedSubject}
                >
                  <Text className="text-white text-xl font-bold">
                    Confirm Selection
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}
