// app/auth/callback.tsx
import { useEffect } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Wait for Supabase to automatically handle the session from the URL
        // Check for session after a short delay
        setTimeout(async () => {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session) {
            console.log("✅ OAuth successful, redirecting to home");
            router.replace("/(tabs)/home");
          } else {
            console.log("❌ No session found after OAuth");
            router.replace("/");
          }
        }, 2000);
      } catch (error) {
        console.error("Auth callback error:", error);
        router.replace("/");
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <View className="flex-1 justify-center items-center bg-stone-950">
      <ActivityIndicator size="large" color="#4ade80" />
      <Text className="text-white mt-4 text-lg">Completing sign in...</Text>
    </View>
  );
}
