import { Link, Stack } from "expo-router";
import { SafeAreaView, View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function NotFoundScreen() {
  return (
    <SafeAreaView className="flex-1 bg-stone-950">
      <Stack.Screen options={{ title: "Oops!" }} />
      <View className="flex-1 justify-center items-center p-6">
        <Ionicons
          name="alert-circle-outline"
          size={100}
          color="#ef4444"
          className="mb-6"
        />
        <Text className="text-4xl font-bold text-center mb-4 text-white">
          Screen Not Found
        </Text>
        <Text className="text-lg text-center mb-8 text-stone-400">
          We couldn't find the screen you were looking for.
        </Text>
        <Link href="/" asChild>
          <TouchableOpacity className="p-4 rounded-lg items-center bg-[#4ade80] shadow-lg">
            <Text className="text-white text-xl font-bold">
              Go to Home Screen
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
    </SafeAreaView>
  );
}
