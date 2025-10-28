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
      try {
        // Get the full URL that opened this screen
        const url = await Linking.getInitialURL();
        console.log("Auth callback URL:", url);
        
        if (url) {
          // Extract the auth code or token from URL
          const params = new URL(url).searchParams;
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          const code = params.get("code");
          
          console.log("Auth params:", { accessToken, code });
          
          if (code || accessToken) {
            // Process the OAuth session with the URL
            const { data, error } = await supabase.auth.exchangeCodeForSession(code || accessToken || "");
            
            if (error) {
              console.error("Error exchanging code for session:", error);
            } else {
              console.log("Session established:", data.session?.user?.email);
              // Redirect to home on successful auth
              router.replace("/(tabs)/home");
              return; // Exit early on success
            }
          }
        }
        
        // Fallback: try to get session directly
        const { data } = await supabase.auth.getSession();
        console.log("Session after OAuth fallback:", data.session?.user?.email);
        
        if (data.session) {
          // We have a session, go to home
          router.replace("/(tabs)/home");
        } else {
          // No session, go back to login
          router.replace("/");
        }
      } catch (error) {
        console.error("Error processing OAuth callback:", error);
        router.replace("/");
      }
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
