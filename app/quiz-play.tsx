import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  StyleSheet,
  Easing,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import { formatDateForStorage, calculateStreak } from "@/utils/streak";
import { useAppContext } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import ConfettiCannon from "react-native-confetti-cannon";

// --- INTERFACES ---
interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
}

interface Profile {
  quiz_days?: string[];
  xp?: number;
  coins?: number;
  current_streak?: number;
}

interface QuizResults {
  xp: number;
  coinsEarned: number;
  correctAnswers: number;
  totalQuestions: number;
  accuracy: number;
  streak: number;
  timeTaken: string;
  timeInMilliseconds: number; // Added for animation
}

const PRIMARY_COLOR = "#38e07b";
const YELLOW_COLOR = "#f59e0b";

// --- HELPER COMPONENTS ---
const AnimatedStatCard = ({
  label,
  icon,
  value,
  color,
  duration = 1500,
  formatter = (v) => v.toFixed(0),
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    animatedValue.addListener(({ value: v }) => {
      setDisplayValue(formatter(v));
    });
    Animated.timing(animatedValue, {
      toValue: value,
      duration,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();
    return () => animatedValue.removeAllListeners();
  }, [value]);

  const { darkMode } = useAppContext();
  return (
    <View
      style={styles.statCard}
      className={darkMode ? "bg-stone-900" : "bg-stone-100"}
    >
      <Text style={styles.statLabel}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={[styles.statValue, { color }]}>{displayValue}</Text>
      </View>
    </View>
  );
};

// --- MAIN COMPONENT ---
export default function QuizPlayScreen() {
  const params = useLocalSearchParams();
  const { quizzes: quizzesJson } = params;
  const initialQuestions: Question[] = quizzesJson
    ? JSON.parse(quizzesJson as string)
    : [];

  const { darkMode, isSoundEnabled, isHapticEnabled } = useAppContext();

  // --- STATE MANAGEMENT ---
  const [questions] = useState<Question[]>(initialQuestions);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [completionResults, setCompletionResults] =
    useState<QuizResults | null>(null);

  // --- REFS ---
  const correctSound = useRef<Audio.Sound | null>(null);
  const wrongSound = useRef<Audio.Sound | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const XP_PER_CORRECT_ANSWER = 20;
  const COINS_PER_CORRECT_ANSWER = 5;

  // --- EFFECTS ---
  // Load and unload sounds
  useEffect(() => {
    const loadSounds = async () => {
      try {
        const { sound: correct } = await Audio.Sound.createAsync(
          require("@/assets/sounds/correct.mp3")
        );
        correctSound.current = correct;
        const { sound: wrong } = await Audio.Sound.createAsync(
          require("@/assets/sounds/wrong.mp3")
        );
        wrongSound.current = wrong;
      } catch (error) {
        console.error("Error loading sounds:", error);
      }
    };
    loadSounds();
    return () => {
      correctSound.current?.unloadAsync();
      wrongSound.current?.unloadAsync();
    };
  }, []);

  // Fetch user data on mount
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
      } else {
        router.replace("/");
      }
    };
    fetchUser();
    startTimeRef.current = Date.now(); // Start timer on mount
  }, []);

  // --- HELPER FUNCTIONS ---
  const playSound = async (
    soundRef: React.MutableRefObject<Audio.Sound | null>
  ) => {
    if (isSoundEnabled) await soundRef.current?.replayAsync();
  };

  const triggerHaptic = async (type: Haptics.NotificationFeedbackType) => {
    if (isHapticEnabled) await Haptics.notificationAsync(type);
  };

  // --- CORE QUIZ LOGIC ---
  const handleOptionSelect = (option: string) => {
    if (isAnswerChecked) return;
    setSelectedOption(option);
  };

  const handleCheckAnswer = () => {
    if (!selectedOption) return;

    const isCorrect =
      selectedOption === questions[currentQuestionIndex].correct_answer;
    if (isCorrect) {
      setCorrectAnswersCount((prev) => prev + 1);
      playSound(correctSound);
      triggerHaptic(Haptics.NotificationFeedbackType.Success);
    } else {
      playSound(wrongSound);
      triggerHaptic(Haptics.NotificationFeedbackType.Error);
    }
    setIsAnswerChecked(true);
  };

  const handleFinishQuiz = async () => {
    setLoading(true);
    try {
      const totalTime = Date.now() - startTimeRef.current;
      const minutes = Math.floor(totalTime / 60000);
      const seconds = Math.floor((totalTime % 60000) / 1000);
      const timeTaken = `${minutes}m ${seconds}s`;

      if (user?.id) {
        const results = await updateProfileOnQuizCompletion(
          user.id,
          correctAnswersCount,
          questions.length,
          totalTime
        );
        setCompletionResults(results);
        setQuizCompleted(true);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to save quiz results.");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerChecked(false);
    } else {
      handleFinishQuiz();
    }
  };

  const updateProfileOnQuizCompletion = async (
    userId: string,
    totalCorrect: number,
    totalQuestions: number,
    timeInMilliseconds: number
  ): Promise<QuizResults> => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("xp, coins, quiz_days")
      .eq("id", userId)
      .single();

    const xpEarned = totalCorrect * XP_PER_CORRECT_ANSWER;
    const coinsEarned = totalCorrect * COINS_PER_CORRECT_ANSWER;
    const newXp = (profile?.xp || 0) + xpEarned;
    const newCoins = (profile?.coins || 0) + coinsEarned;

    const today = formatDateForStorage(new Date());
    const newQuizDays = Array.from(
      new Set([...(profile?.quiz_days || []), today])
    ).sort();
    const newStreak = calculateStreak(newQuizDays);

    await supabase
      .from("profiles")
      .update({
        xp: newXp,
        coins: newCoins,
        quiz_days: newQuizDays,
        last_quiz_completed_at: today,
        current_streak: newStreak,
      })
      .eq("id", userId);

    const minutes = Math.floor(timeInMilliseconds / 60000);
    const seconds = Math.floor((timeInMilliseconds % 60000) / 1000);
    const timeTaken = `${minutes}m ${seconds}s`;

    return {
      xp: xpEarned,
      coinsEarned,
      correctAnswers: totalCorrect,
      totalQuestions,
      accuracy: totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0,
      streak: newStreak,
      timeTaken,
      timeInMilliseconds,
    };
  };

  const handleRetakeQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswerChecked(false);
    setCorrectAnswersCount(0);
    setQuizCompleted(false);
    setCompletionResults(null);
    startTimeRef.current = Date.now();
  };

  // --- RENDER FUNCTIONS ---
  if (quizCompleted && completionResults) {
    const totalXP = completionResults.xp;
    const accuracy = completionResults.accuracy;
    const timeInSeconds = completionResults.timeInMilliseconds / 1000;
    const coinsEarned = completionResults.coinsEarned;
    const streak = completionResults.streak;

    return (
      <SafeAreaView
        className={`flex-1 p-4 justify-between ${
          darkMode ? "bg-stone-950" : "bg-gray-50"
        }`}
      >
        <ConfettiCannon
          count={200}
          origin={{ x: -10, y: 0 }}
          autoStart={true}
          fadeOut={true}
        />
        <View />
        <View>
          <View className="items-center mb-10">
            <Text
              className={`text-5xl font-bold ${
                darkMode ? "text-white" : "text-black"
              }`}
            >
              Quiz complete!
            </Text>
            <Ionicons
              name="sparkles"
              size={40}
              color={YELLOW_COLOR}
              style={{ marginTop: 10 }}
            />
          </View>
          <View className="flex-row justify-around">
            <AnimatedStatCard
              label="TOTAL XP"
              icon="flash"
              value={totalXP}
              color="#facc15"
            />
            <AnimatedStatCard
              label="COINS"
              icon="cash-outline"
              value={coinsEarned}
              color={PRIMARY_COLOR}
            />
            <AnimatedStatCard
              label="ACCURACY"
              icon="checkmark-circle"
              value={accuracy}
              color="#38bdf8"
              formatter={(v) => `${v.toFixed(0)}%`}
            />
          </View>
          <View className="flex-row justify-center mt-6">
            <AnimatedStatCard
              label="TIME"
              icon="timer-outline"
              value={timeInSeconds}
              color="#f59e0b"
              formatter={(v) =>
                `${Math.floor(v / 60)}:${(v % 60).toFixed(0).padStart(2, "0")}`
              }
            />
            <AnimatedStatCard
              label="STREAK"
              icon="flame"
              value={streak}
              color="#ef4444"
            />
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.replace("/(tabs)/home")}
          className="w-full bg-blue-500 py-4 rounded-full items-center"
        >
          <Text className="text-white font-bold text-lg">Continue</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // --- QUIZ QUESTION SCREEN ---
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) {
    return (
      <SafeAreaView className={darkMode ? "bg-stone-950" : "bg-white"}>
        <ActivityIndicator color={PRIMARY_COLOR} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className={`flex-1 ${darkMode ? "bg-stone-950" : "bg-white"}`}
    >
      <View className="flex-grow">
        <View
          className={`flex-row items-center p-4 border-b ${
            darkMode ? "border-stone-800" : "border-stone-200"
          }`}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 rounded-full"
          >
            <Ionicons
              name="close"
              size={24}
              color={darkMode ? "white" : "black"}
            />
          </TouchableOpacity>
          <View className="flex-1 mx-4">
            <View
              className={`w-full h-2.5 rounded-full ${
                darkMode ? "bg-stone-800" : "bg-stone-200"
              }`}
            >
              <View
                className="h-2.5 rounded-full"
                style={{
                  width: `${progress}%`,
                  backgroundColor: PRIMARY_COLOR,
                }}
              />
            </View>
          </View>
          <View className="flex-row items-center gap-1">
            <Ionicons name="heart" size={24} color="#ef4444" />
            <Text
              className={`text-sm font-bold ${
                darkMode ? "text-white" : "text-black"
              }`}
            >
              3
            </Text>
          </View>
        </View>

        <ScrollView className="p-6">
          <Text
            className={`text-3xl font-bold mb-6 ${
              darkMode ? "text-white" : "text-black"
            }`}
          >
            {currentQuestion.question_text}
          </Text>
          <View className="space-y-4">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedOption === option;
              const isCorrect = option === currentQuestion.correct_answer;

              let buttonStyle = darkMode
                ? "border-stone-800"
                : "border-stone-200";
              let bgStyle = "bg-transparent";

              if (isAnswerChecked) {
                if (isCorrect) {
                  buttonStyle = `border-green-500`;
                  bgStyle = darkMode ? `bg-green-950` : `bg-green-50`;
                } else if (isSelected && !isCorrect) {
                  buttonStyle = `border-red-500`;
                  bgStyle = darkMode ? `bg-red-950` : `bg-red-50`;
                }
              } else if (isSelected) {
                buttonStyle = `border-[${PRIMARY_COLOR}]`;
                bgStyle = darkMode ? `bg-emerald-950` : `bg-emerald-50`;
              }

              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleOptionSelect(option)}
                  disabled={isAnswerChecked}
                  className={`w-full flex-row items-center p-4 rounded-xl border-2 ${buttonStyle} ${bgStyle}`}
                >
                  <Text
                    className={`text-lg font-bold ${
                      darkMode ? "text-white" : "text-black"
                    }`}
                  >
                    {String.fromCharCode(65 + index)}
                  </Text>
                  <Text
                    className={`ml-4 text-lg ${
                      darkMode ? "text-white" : "text-black"
                    }`}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View
        className={`px-6 py-4 border-t ${
          darkMode
            ? "border-stone-800 bg-stone-950"
            : "border-stone-200 bg-white"
        }`}
      >
        <TouchableOpacity
          onPress={!isAnswerChecked ? handleCheckAnswer : handleNext}
          disabled={!selectedOption || loading}
          className="w-full h-12 px-4 rounded-xl items-center justify-center"
          style={{
            backgroundColor: !selectedOption
              ? darkMode
                ? "#444"
                : "#ccc"
              : PRIMARY_COLOR,
          }}
        >
          {loading ? (
            <ActivityIndicator color="black" />
          ) : (
            <Text className="text-black text-sm font-bold">
              {!isAnswerChecked
                ? "Check"
                : currentQuestionIndex < questions.length - 1
                ? "Next"
                : "Finish"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Completion Screen Styles
  statCard: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    width: "30%",
    gap: 8,
  },
  statLabel: {
    color: "#94a3b8", // text-slate-400
    fontWeight: "bold",
    fontSize: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
});
