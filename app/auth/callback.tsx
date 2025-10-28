// app/auth/callback.tsx
import { useEffect } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabaseClient";
import * as Linking from "expo-linking";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleRedirect = async () => {
      const url = await Linking.createURL(""); // Get the full incoming URL
      // But actually, we can just let Supabase handle it automatically
      // by calling getSession — it reads from the deep link internally

      try {
        // This forces Supabase to process the OAuth response
        const { data } = await supabase.auth.getSession();
        console.log("Session after OAuth:", data.session?.user?.email);
      } catch (error) {
        console.error("Error processing OAuth callback:", error);
      }

      // Now go back to root — which will check session and redirect
      router.replace("/");
    };

    handleRedirect();
  }, [router]);

  return (
    <View className="flex-1 justify-center items-center bg-stone-950">
      <ActivityIndicator size="large" color="#4ade80" />
      <Text className="text-white mt-4 text-lg">Finishing sign in...</Text>
    </View>
  );
}
