import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabaseClient";
import { useAppContext } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

// --- INTERFACES & CONSTANTS ---
interface Flashcard {
  id: string;
  front_text: string;
  back_text: string;
  grade: string;
  subject: string;
  unit: string;
  is_premium: boolean;
}

interface Unit {
  name: string;
  cardCount: number;
  isPremium: boolean;
  cards: Flashcard[]; // Preload cards for easy navigation
}

interface DueCard {
  id: string;
  front_text: string;
  back_text: string;
  grade: string;
  subject: string;
  unit: string;
  is_premium: boolean;
  next_review_at: string;
  mastery_tag: string;
}

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

// --- MAIN COMPONENT ---
export default function FlashcardsScreen() {
  const { darkMode } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [dueCardsLoading, setDueCardsLoading] = useState(false);

  // Main screen selections
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  // Data for the main screen
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);

  // Due cards data
  const [dueCards, setDueCards] = useState<DueCard[]>([]);
  const [showDueCards, setShowDueCards] = useState(false);

  // State for the selection modal
  const [isSelectionModalVisible, setIsSelectionModalVisible] = useState(false);
  const [modalSelectedGrade, setModalSelectedGrade] = useState<string | null>(
    null
  );
  const [modalSelectedSubject, setModalSelectedSubject] = useState<
    string | null
  >(null);

  // Fetch due cards for the current user
  const fetchDueCards = async () => {
    setDueCardsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setDueCards([]);
        setDueCardsLoading(false);
        return;
      }

      // Get cards that are due for review (next_review_at <= now)
      const now = new Date().toISOString();
      const { data: progressData, error: progressError } = await supabase
        .from("user_flashcard_progress")
        .select("flashcard_id, next_review_at, mastery_tag")
        .eq("user_id", user.id)
        .lte("next_review_at", now);

      if (progressError) throw progressError;

      if (progressData && progressData.length > 0) {
        const flashcardIds = progressData.map((p) => p.flashcard_id);

        // Get the actual flashcard data
        const { data: flashcardsData, error: flashcardsError } = await supabase
          .from("flashcards")
          .select("*")
          .in("id", flashcardIds);

        if (flashcardsError) throw flashcardsError;

        // Combine progress data with flashcard data
        const dueCardsData = flashcardsData.map((card) => {
          const progress = progressData.find((p) => p.flashcard_id === card.id);
          return {
            ...card,
            next_review_at:
              progress?.next_review_at || new Date().toISOString(),
            mastery_tag: progress?.mastery_tag || "Rookie",
          } as DueCard;
        });

        setDueCards(dueCardsData);
      } else {
        setDueCards([]);
      }
    } catch (e: any) {
      console.error("Error fetching due cards:", e);
      Alert.alert("Error", "Failed to load due cards");
      setDueCards([]);
    } finally {
      setDueCardsLoading(false);
    }
  };

  useEffect(() => {
    fetchDueCards();
  }, []);

  useEffect(() => {
    const fetchUnits = async () => {
      if (!selectedGrade || !selectedSubject) {
        setAvailableUnits([]);
        return;
      }
      setLoading(true);
      try {
        const { data: allCards, error } = await supabase
          .from("flashcards")
          .select("*")
          .eq("grade", selectedGrade)
          .eq("subject", selectedSubject);

        if (error) throw error;

        const unitsMap = allCards.reduce((acc, card) => {
          const unitName = card.unit || "General";
          if (!acc[unitName]) {
            acc[unitName] = { cards: [], isPremium: false };
          }
          acc[unitName].cards.push(card);
          if (card.is_premium) {
            acc[unitName].isPremium = true;
          }
          return acc;
        }, {} as Record<string, { cards: Flashcard[]; isPremium: boolean }>);

        const unitsData: Unit[] = Object.keys(unitsMap).map((unitName) => ({
          name: unitName,
          cardCount: unitsMap[unitName].cards.length,
          isPremium: unitsMap[unitName].isPremium,
          cards: unitsMap[unitName].cards,
        }));

        setAvailableUnits(unitsData);
      } catch (e: any) {
        Alert.alert("Error", `Failed to load decks: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchUnits();
  }, [selectedGrade, selectedSubject]);

  const confirmSelection = () => {
    setSelectedGrade(modalSelectedGrade);
    setSelectedSubject(modalSelectedSubject);
    setIsSelectionModalVisible(false);
  };

  const handleUnitSelect = (unit: Unit) => {
    router.push({
      pathname: "/flashcard-play",
      params: {
        flashcards: JSON.stringify(unit.cards),
        grade: selectedGrade,
        subject: selectedSubject,
        unit: unit.name,
      },
    });
  };

  const handleDueCardSelect = (cards: DueCard[]) => {
    router.push({
      pathname: "/flashcard-play",
      params: {
        flashcards: JSON.stringify(cards),
        isDueCards: "true",
      },
    });
  };

  const getSubjectIcon = (subjectName: string | null) => {
    if (!subjectName) return "book-outline";
    return (
      ALL_SUBJECTS.find((s) => s.name === subjectName)?.icon || "book-outline"
    );
  };

  const renderDueCardItem = ({ item }: { item: DueCard }) => (
    <View
      className={`p-4 rounded-xl mb-3 ${
        darkMode ? "bg-stone-900" : "bg-white"
      }`}
    >
      <View className="flex-row items-center mb-2">
        <Ionicons
          name={getSubjectIcon(item.subject) as any}
          size={20}
          color={PRIMARY_COLOR}
        />
        <Text
          className={`ml-2 font-bold ${darkMode ? "text-white" : "text-black"}`}
        >
          {item.subject} • {item.unit}
        </Text>
        <View className="ml-auto flex-row items-center">
          <View
            className={`px-2 py-1 rounded-full ${
              item.mastery_tag === "Rookie"
                ? "bg-gray-500"
                : item.mastery_tag === "Apprentice"
                ? "bg-blue-500"
                : item.mastery_tag === "Journeyman"
                ? "bg-green-500"
                : item.mastery_tag === "Expert"
                ? "bg-purple-500"
                : "bg-yellow-500"
            }`}
          >
            <Text className="text-white text-xs font-bold">
              {item.mastery_tag}
            </Text>
          </View>
        </View>
      </View>
      <Text
        className={`text-lg font-medium ${
          darkMode ? "text-white" : "text-black"
        }`}
        numberOfLines={1}
      >
        {item.front_text}
      </Text>
      <Text className="text-gray-400 text-sm" numberOfLines={2}>
        {item.back_text}
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      className={`flex-1 ${darkMode ? "bg-stone-950" : "bg-gray-100"}`}
    >
      <View className="flex-row items-center p-4">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={darkMode ? "white" : "black"}
          />
        </TouchableOpacity>
        <Text
          className={`flex-1 text-center text-xl font-bold ${
            darkMode ? "text-white" : "text-black"
          }`}
        >
          Flashcard Decks
        </Text>
        <TouchableOpacity onPress={() => setIsSelectionModalVisible(true)}>
          <Ionicons
            name="options-outline"
            size={24}
            color={darkMode ? "white" : "black"}
          />
        </TouchableOpacity>
      </View>

      {/* Due Cards Section */}
      <View className="px-4 mb-4">
        <View className="flex-row justify-between items-center mb-3">
          <Text
            className={`text-xl font-bold ${
              darkMode ? "text-white" : "text-black"
            }`}
          >
            Due for Review
          </Text>
          {dueCards.length > 0 && (
            <TouchableOpacity
              onPress={() => handleDueCardSelect(dueCards)}
              className="flex-row items-center"
            >
              <Text className="text-emerald-500 font-semibold">Study All</Text>
              <Ionicons name="arrow-forward" size={16} color="#38e07b" />
            </TouchableOpacity>
          )}
        </View>

        {dueCardsLoading ? (
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
        ) : dueCards.length > 0 ? (
          <FlatList
            data={dueCards.slice(0, 3)} // Show only first 3 due cards
            renderItem={renderDueCardItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          />
        ) : (
          <View
            className={`p-4 rounded-xl ${
              darkMode ? "bg-stone-900" : "bg-white"
            }`}
          >
            <Text
              className={`text-center ${
                darkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              No cards due for review
            </Text>
            <Text
              className={`text-center text-xs mt-1 ${
                darkMode ? "text-gray-500" : "text-gray-400"
              }`}
            >
              Keep studying to build your review schedule
            </Text>
          </View>
        )}
      </View>

      <ScrollView className="px-4">
        {loading ? (
          <ActivityIndicator
            size="large"
            color={PRIMARY_COLOR}
            className="my-8"
          />
        ) : selectedGrade && selectedSubject ? (
          // --- VIEW WHEN A DECK IS SELECTED ---
          <>
            <Text
              className={`text-xl font-bold mb-4 ${
                darkMode ? "text-white" : "text-black"
              }`}
            >
              {selectedSubject} Decks ({selectedGrade})
            </Text>
            {availableUnits.length > 0 ? (
              availableUnits.map((unit) => (
                <TouchableOpacity
                  key={unit.name}
                  onPress={() => handleUnitSelect(unit)}
                  className={`p-4 rounded-xl mb-4 ${
                    darkMode ? "bg-stone-900" : "bg-white"
                  }`}
                >
                  <View className="flex-row items-center mb-2">
                    <Ionicons
                      name={getSubjectIcon(selectedSubject) as any}
                      size={24}
                      color={PRIMARY_COLOR}
                    />
                    <Text
                      className={`ml-3 font-bold text-lg ${
                        darkMode ? "text-white" : "text-black"
                      }`}
                    >
                      {unit.name}
                    </Text>
                  </View>
                  <Text className="text-gray-400 text-sm">
                    {unit.cardCount} Cards
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <View
                className={`p-6 items-center rounded-xl ${
                  darkMode ? "bg-stone-900" : "bg-white"
                }`}
              >
                <Text
                  className={`text-center font-bold ${
                    darkMode ? "text-white" : "text-black"
                  }`}
                >
                  No Decks Found
                </Text>
                <Text className="text-center text-gray-400 mt-2">
                  There are no flashcard units available for this selection yet.
                </Text>
              </View>
            )}
          </>
        ) : (
          // --- VIEW WHEN NOTHING IS SELECTED ---
          <View
            className={`p-6 items-center rounded-xl ${
              darkMode ? "bg-stone-900" : "bg-white"
            }`}
          >
            <Ionicons
              name="layers-outline"
              size={48}
              color={darkMode ? PRIMARY_COLOR : "black"}
            />
            <Text
              className={`text-xl text-center font-bold mt-4 ${
                darkMode ? "text-white" : "text-black"
              }`}
            >
              Select a Deck
            </Text>
            <Text className="text-center text-gray-400 mt-2 mb-6">
              Choose a grade and subject to find flashcard decks to study.
            </Text>
            <TouchableOpacity
              onPress={() => setIsSelectionModalVisible(true)}
              className="flex-row items-center gap-2 p-4 rounded-lg"
              style={{ backgroundColor: PRIMARY_COLOR }}
            >
              <Ionicons name="options-outline" size={20} color="black" />
              <Text className="text-black font-bold">
                Select Grade & Subject
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* --- Grade & Subject Selection Modal --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isSelectionModalVisible}
        onRequestClose={() => setIsSelectionModalVisible(false)}
      >
        <TouchableOpacity
          className="flex-1 justify-end bg-black/60"
          activeOpacity={1}
          onPress={() => setIsSelectionModalVisible(false)}
        >
          <View
            className={`w-full rounded-t-2xl p-6 shadow-lg ${
              darkMode ? "bg-stone-800" : "bg-white"
            }`}
            onStartShouldSetResponder={() => true}
          >
            <Text
              className={`text-2xl font-bold mb-4 text-center ${
                darkMode ? "text-white" : "text-black"
              }`}
            >
              Select Deck
            </Text>

            <Text
              className={`text-lg font-bold mb-3 ${
                darkMode ? "text-white" : "text-black"
              }`}
            >
              Grade
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-6"
            >
              {ALL_GRADES.map((grade) => (
                <TouchableOpacity
                  key={grade}
                  onPress={() => setModalSelectedGrade(grade)}
                  className={`py-3 px-5 rounded-lg mr-2 border-2 ${
                    modalSelectedGrade === grade
                      ? `border-[${PRIMARY_COLOR}] bg-emerald-950`
                      : darkMode
                      ? "border-stone-700 bg-stone-900"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <Text
                    className={`font-bold ${
                      modalSelectedGrade === grade
                        ? `text-[${PRIMARY_COLOR}]`
                        : darkMode
                        ? "text-white"
                        : "text-black"
                    }`}
                  >
                    {grade}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text
              className={`text-lg font-bold mb-3 ${
                darkMode ? "text-white" : "text-black"
              }`}
            >
              Subject
            </Text>
            <View className="flex-row flex-wrap">
              {ALL_SUBJECTS.map((subject) => (
                <TouchableOpacity
                  key={subject.name}
                  onPress={() => setModalSelectedSubject(subject.name)}
                  className={`p-3 rounded-lg mr-2 mb-2 flex-row items-center border-2 ${
                    modalSelectedSubject === subject.name
                      ? `border-[${PRIMARY_COLOR}] bg-emerald-950`
                      : darkMode
                      ? "border-stone-700 bg-stone-900"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <Ionicons
                    name={subject.icon as any}
                    size={20}
                    color={
                      modalSelectedSubject === subject.name
                        ? PRIMARY_COLOR
                        : darkMode
                        ? "white"
                        : "black"
                    }
                  />
                  <Text
                    className={`ml-2 font-bold ${
                      modalSelectedSubject === subject.name
                        ? `text-[${PRIMARY_COLOR}]`
                        : darkMode
                        ? "text-white"
                        : "text-black"
                    }`}
                  >
                    {subject.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={confirmSelection}
              disabled={!modalSelectedGrade || !modalSelectedSubject}
              className="p-4 rounded-lg items-center mt-6"
              style={{
                backgroundColor:
                  !modalSelectedGrade || !modalSelectedSubject
                    ? darkMode
                      ? "#4A5568"
                      : "#D1D5DB"
                    : PRIMARY_COLOR,
              }}
            >
              <Text className="text-black text-xl font-bold">Confirm</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
