// app/context/ThemeContext.tsx
import { supabase } from "@/lib/supabaseClient";
import { Session, User } from "@supabase/supabase-js";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Appearance, Alert } from "react-native";
import { router } from "expo-router";
import { scheduleDefaultReminders } from "@/utils/notifications";

// Types
export interface UserProfile {
  id: string;
  username: string | null;
  xp: number;
  coins: number;
  streak_freeze_count: number;
  avatar_url: string | null;
  last_quiz_completed_at: string | null;
  quiz_days: string[];
  freeze_days: string[];
  current_streak: number;
  is_premium: boolean;
  premium_until: string | null;
  reminders_scheduled?: boolean;
}

export interface UserSettings {
  user_id: string;
  dark_mode: boolean;
  sound_enabled: boolean;
  haptic_enabled: boolean;
  notification_enabled: boolean;
  notification_time: string;
}

export interface AppContextType {
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  refreshUserProfile: () => Promise<void>;
  darkMode: boolean;
  isSoundEnabled: boolean;
  isHapticEnabled: boolean;
  isNotificationEnabled: boolean;
  toggleDarkMode: () => Promise<void>;
  toggleSound: () => Promise<void>;
  toggleHaptics: () => Promise<void>;
  toggleNotifications: () => Promise<void>;
  scheduleNotification: (time: Date) => Promise<void>;
  activatePremium: (code: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [darkMode, setDarkMode] = useState<boolean>(
    Appearance.getColorScheme() === "dark"
  );
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isHapticEnabled, setIsHapticEnabled] = useState(true);
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(true);

  // Fetch user profile and settings
  const fetchUserProfile = useCallback(async (user: User) => {
    try {
      if (!user) {
        setUserProfile(null);
        return;
      }

      // 1. Get or create profile
      let { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError && profileError.code === "PGRST116") {
        // Create profile if doesn't exist
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert([
            {
              id: user.id,
              username:
                user.user_metadata?.username ||
                user.email?.split("@")[0] ||
                "User",
              xp: 0,
              coins: 0,
              streak_freeze_count: 0,
              avatar_url: null,
              last_quiz_completed_at: null,
              quiz_days: [],
              freeze_days: [],
              current_streak: 0,
              is_premium: false,
              premium_until: null,
              reminders_scheduled: false,
            },
          ])
          .select()
          .single();

        if (insertError) throw insertError;
        profileData = newProfile;
      } else if (profileError) {
        throw profileError;
      }

      setUserProfile(profileData as UserProfile);

      // 2. Get or create settings
      let { data: settingsData, error: settingsError } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (settingsError && settingsError.code === "PGRST116") {
        const { data: newSettingsData, error: newSettingsError } =
          await supabase
            .from("settings")
            .upsert(
              {
                user_id: user.id,
                dark_mode: Appearance.getColorScheme() === "dark",
                sound_enabled: true,
                haptic_enabled: true,
                notification_enabled: true,
                notification_time: "20:00:00",
              },
              { onConflict: "user_id" }
            )
            .select()
            .single();

        if (newSettingsError) throw newSettingsError;
        settingsData = newSettingsData;
      } else if (settingsError) {
        throw settingsError;
      }

      // 3. Apply settings to state
      if (settingsData) {
        setDarkMode(settingsData.dark_mode);
        setIsSoundEnabled(settingsData.sound_enabled);
        setIsHapticEnabled(settingsData.haptic_enabled);
        setIsNotificationEnabled(settingsData.notification_enabled !== false);
      }

      // ✅ 4. Schedule reminders ONLY if not already done
      if (
        profileData &&
        profileData.reminders_scheduled !== true && // ← KEY FIX
        settingsData?.notification_enabled !== false
      ) {
        console.log("📅 Scheduling default reminders for first time");
        await scheduleDefaultReminders(user.id);
      }
    } catch (error: any) {
      console.error("Error fetching user data:", error.message);
      setUserProfile(null);
    }
  }, []);

  const refreshUserProfile = useCallback(async () => {
    if (session?.user) {
      await fetchUserProfile(session.user);
    }
  }, [session, fetchUserProfile]);

  // Initialize auth
  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSession(session);
        if (session) {
          await fetchUserProfile(session.user);
        }
      } catch (error) {
        console.error("Error getting session:", error);
      } finally {
        setLoading(false);
      }
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session) {
          await fetchUserProfile(session.user);
        } else {
          setUserProfile(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  // Toggle notifications
  const toggleNotifications = async () => {
    if (!session?.user) {
      Alert.alert("Error", "Please log in first.");
      return;
    }

    const nextValue = !isNotificationEnabled;

    if (!nextValue) {
      // Turn OFF → cancel all
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log("🔕 Notifications turned OFF");
    } else {
      // Turn ON → safely schedule (function checks if already done)
      if (userProfile?.id) {
        await scheduleDefaultReminders(userProfile.id);
      }
    }

    // Save to DB
    const { error } = await supabase
      .from("settings")
      .update({ notification_enabled: nextValue })
      .eq("user_id", session.user.id);

    if (error) {
      Alert.alert("Error", "Failed to save setting.");
    } else {
      setIsNotificationEnabled(nextValue);
      console.log(`🔔 Notifications turned ${nextValue ? "ON" : "OFF"}`);
    }
  };

  // Other toggles
  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!session?.user) return;
    const { error } = await supabase
      .from("settings")
      .update(updates)
      .eq("user_id", session.user.id);
    if (error) Alert.alert("Error", "Failed to save settings.");
  };

  const toggleDarkMode = async () => {
    setDarkMode((prev) => {
      updateSettings({ dark_mode: !prev });
      return !prev;
    });
  };

  const toggleSound = async () => {
    setIsSoundEnabled((prev) => {
      updateSettings({ sound_enabled: !prev });
      return !prev;
    });
  };

  const toggleHaptics = async () => {
    setIsHapticEnabled((prev) => {
      if (!prev)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      updateSettings({ haptic_enabled: !prev });
      return !prev;
    });
  };

  const scheduleNotification = async (time: Date) => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Enable notifications in settings.");
      return;
    }

    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: { title: "Study Time!", body: "Review your flashcards." },
      trigger: {
        hour: time.getHours(),
        minute: time.getMinutes(),
        repeats: true,
      },
    });

    await updateSettings({
      notification_enabled: true,
      notification_time: time.toTimeString().substring(0, 8),
    });
  };

  const activatePremium = async (code: string) => {
    if (!session?.user) {
      Alert.alert("Error", "Please log in first.");
      return;
    }

    try {
      // 1. Check if code exists and is valid
      const { data: premiumCode, error: codeError } = await supabase
        .from("premium_codes")
        .select("*")
        .eq("code", code.toUpperCase().trim())
        .is("is_used", false)
        .gte("expires_at", new Date().toISOString())
        .single();

      if (codeError || !premiumCode) {
        Alert.alert(
          "Invalid Code",
          "This premium code is invalid or has expired."
        );
        return;
      }

      // 2. Check if user already has premium
      if (userProfile?.is_premium) {
        Alert.alert(
          "Already Premium",
          "You already have an active premium subscription."
        );
        return;
      }

      // 3. Activate premium for user
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1); // 1 year premium

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          is_premium: true,
          premium_until: expires.toISOString(),
        })
        .eq("id", session.user.id);

      if (updateError) throw updateError;

      // 4. Mark code as used
      const { error: markUsedError } = await supabase
        .from("premium_codes")
        .update({
          is_used: true,
          user_id_activated: session.user.id,
          activated_at: new Date().toISOString(),
        })
        .eq("id", premiumCode.id);

      if (markUsedError) throw markUsedError;

      // 5. Refresh user profile
      await refreshUserProfile();
      Alert.alert(
        "Success",
        "Premium activated successfully! Enjoy your premium features."
      );
    } catch (error) {
      console.error("Premium activation error:", error);
      Alert.alert("Error", "Failed to activate premium. Please try again.");
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const value = {
    session,
    userProfile,
    loading,
    refreshUserProfile,
    darkMode,
    isSoundEnabled,
    isHapticEnabled,
    isNotificationEnabled,
    toggleDarkMode,
    toggleSound,
    toggleHaptics,
    toggleNotifications,
    scheduleNotification,
    activatePremium,
    logout,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context)
    throw new Error("useAppContext must be used within AppProvider");
  return context;
};
