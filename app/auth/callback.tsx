// app/auth/callback.tsx (Simplified)
import { useEffect } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { useRouter } from "expo-router";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // When the app returns to this screen, the URL contains the session info.
    // Supabase client should automatically process this URL and save the session.
    // We just wait a very short moment for the session to be processed,
    // then immediately redirect back to the entry point (index.tsx)
    // which will handle the final redirect to home or back to auth based on the session state.
    setTimeout(() => {
      console.log("Auth callback complete, returning to app root.");
      router.replace("/");
    }, 100); // 100ms should be enough time for Supabase to process the URL

    // Note: If you have a global state/context monitoring the session (like useAppContext),
    // the root (index.tsx) will handle the /tabs/home redirect automatically.
  }, [router]);

  return (
    <View className="flex-1 justify-center items-center bg-stone-950">
      <ActivityIndicator size="large" color="#4ade80" />
      <Text className="text-white mt-4 text-lg">Completing sign in...</Text>
    </View>
  );
}
