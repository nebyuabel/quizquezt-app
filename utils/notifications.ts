// app/utils/notifications.ts
import * as Notifications from "expo-notifications";
import { supabase } from "@/lib/supabaseClient";

export async function scheduleDefaultReminders(userId: string) {
  console.log("🔔 scheduleDefaultReminders called for user:", userId);

  // Fetch profile to check if already scheduled
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("reminders_scheduled")
    .eq("id", userId)
    .single();

  if (fetchError) {
    console.error("❌ Error fetching profile:", fetchError);
    return;
  }

  // 🚫 If already marked as scheduled, DO NOTHING
  if (profile?.reminders_scheduled === true) {
    console.log("✅ Already scheduled. Skipping.");
    return;
  }

  // Check if notifications are enabled
  const { data: settings, error: settingsError } = await supabase
    .from("settings")
    .select("notification_enabled")
    .eq("user_id", userId)
    .single();

  if (settingsError) {
    console.warn("⚠️ Could not fetch notification settings, assuming enabled.");
  } else if (settings?.notification_enabled === false) {
    console.log("🔕 Notifications disabled. Skipping.");
    return;
  }

  // 🧹 Cancel any existing to avoid duplicates
  await Notifications.cancelAllScheduledNotificationsAsync();

  // ⏰ Schedule 8 PM Quiz Reminder
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "📚 QuizQuezt Reminder",
      body: "Don't break your streak! Complete a quiz today.",
      sound: "default",
      data: { type: "streak-reminder" },
    },
    trigger: {
      hour: 20,
      minute: 0,
      repeats: true,
    },
  });

  // ⏰ Schedule 6 AM Flashcard Reminder
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🃏 Flashcard Time!",
      body: "Time to review your flashcards and boost your memory!",
      sound: "default",
      data: { type: "flashcard-reminder" },
    },
    trigger: {
      hour: 6,
      minute: 0,
      repeats: true,
    },
  });

  // ✅ Mark as scheduled in DB
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ reminders_scheduled: true })
    .eq("id", userId);

  if (updateError) {
    console.error("❌ Failed to mark as scheduled:", updateError);
  } else {
    console.log("🎉 Successfully scheduled and marked for user:", userId);
  }
}
