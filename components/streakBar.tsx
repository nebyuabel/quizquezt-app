import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface WeekStreakBarProps {
  currentStreak: number;
  quizDays: string[];
  freezeDays: string[];
}

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const getDayStatus = (
  day: string,
  quizDays: string[],
  freezeDays: string[],
  currentStreak: number
) => {
  const today = new Date().toLocaleDateString("en-US", { weekday: "short" });
  const isToday = day === today;
  const isCompleted = quizDays.includes(day);
  const isFrozen = freezeDays.includes(day);

  if (isToday) {
    return {
      icon: "flame-outline",
      iconColor: "#facc15",
      bgColor: "bg-gray-700",
      textColor: "text-white font-bold",
      opacity: 1,
    };
  }
  if (isCompleted || isFrozen) {
    return {
      icon: "checkmark-outline",
      iconColor: "#10b981",
      bgColor: "bg-[#38e07b]",
      textColor: "text-gray-400",
      opacity: 1,
    };
  }
  return {
    icon: "",
    iconColor: "",
    bgColor: "bg-gray-700",
    textColor: "text-gray-400",
    opacity: 0.5,
  };
};

export default function WeekStreakBar({
  currentStreak,
  quizDays,
  freezeDays,
}: WeekStreakBarProps) {
  return (
    <View className="p-4 rounded-xl bg-gray-800 mb-6">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-gray-400 text-sm font-medium">Week Streak</Text>
        <View className="flex-row items-center gap-1">
          <Ionicons name="flame-outline" size={20} color="#facc15" />
          <Text className="text-white font-bold text-lg">{currentStreak}</Text>
        </View>
      </View>
      <View className="flex-row justify-between">
        {daysOfWeek.map((day) => {
          const status = getDayStatus(day, quizDays, freezeDays, currentStreak);
          return (
            <View
              key={day}
              className={`flex flex-col items-center gap-2`}
              style={{ opacity: status.opacity }}
            >
              <View
                className={`size-10 flex items-center justify-center rounded-full ${status.bgColor}`}
              >
                {status.icon && (
                  <Ionicons
                    name={status.icon as any}
                    size={24}
                    color={status.iconColor}
                  />
                )}
              </View>
              <Text className={`text-xs ${status.textColor}`}>{day}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
