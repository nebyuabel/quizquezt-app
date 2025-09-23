// app/(tabs)/store.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
} from "react-native";
import { useAppContext } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabaseClient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// Define types
interface StoreItem {
  id: string;
  name: string;
  price: number;
  type: "freeze" | "xp_boost";
  duration?: number;
}

export default function StoreScreen() {
  const { darkMode } = useAppContext();
  const [items] = useState<StoreItem[]>([
    { id: "freeze1", name: "Streak Freeze", price: 50, type: "freeze" },
    {
      id: "xpboost1",
      name: "XP Boost (5 uses)",
      price: 100,
      type: "xp_boost",
      duration: 5,
    },
  ]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch user's coin balance
  useEffect(() => {
    const fetchBalance = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!data?.user) {
          router.replace("/");
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("coins")
          .eq("id", data.user.id)
          .single();

        if (profileError) throw profileError;
        setBalance(profileData?.coins || 0);
      } catch (error: any) {
        console.error("Error fetching balance:", error.message);
        Alert.alert("Error", "Failed to load your coin balance.");
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();

    // Set up real-time listener for coin balance
    const setupRealtimeListener = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error getting user:", error.message);
        return;
      }
      if (!data?.user) return;

      const channel = supabase
        .channel("coins_update")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${data.user.id}`,
          },
          (payload) => {
            const updatedProfile = payload.new as { coins: number };
            setBalance(updatedProfile.coins);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanup = setupRealtimeListener();
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Handle item purchase
  const handlePurchase = async (item: StoreItem) => {
    if (loading) return;

    if (balance < item.price) {
      Alert.alert(
        "Insufficient Coins",
        "You need more coins to buy this item."
      );
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!data?.user) {
        Alert.alert("Error", "Please log in to make purchases.");
        return;
      }

      // Fetch current profile data
      const { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("coins, streak_freeze_count")
        .eq("id", data.user.id)
        .single();

      if (fetchError) throw fetchError;

      const newBalance = (profile?.coins || 0) - item.price;

      if (item.type === "freeze") {
        // Update coins and streak_freeze_count
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            coins: newBalance,
            streak_freeze_count: (profile?.streak_freeze_count || 0) + 1,
          })
          .eq("id", data.user.id);

        if (updateError) throw updateError;
      } else if (item.type === "xp_boost") {
        // Handle XP boost (simplified)
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            coins: newBalance,
          })
          .eq("id", data.user.id);

        if (updateError) throw updateError;

        // You might want to update a separate boosts table here
        console.log("XP Boost purchased - implement boost tracking");
      }

      setBalance(newBalance);
      Alert.alert(
        "Purchase Successful",
        `${item.name} has been added to your account!`
      );
    } catch (error: any) {
      console.error("Purchase error:", error.message);
      Alert.alert("Error", "Failed to complete purchase. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, darkMode && styles.headerDark]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back-outline" size={24} color="#38E07B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Store</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Balance Display */}
        <View style={[styles.balanceCard, darkMode && styles.cardDark]}>
          <View style={styles.balanceRow}>
            <Ionicons name="cash-outline" size={24} color="#FACC15" />
            <Text style={[styles.balanceLabel, darkMode && styles.textDark]}>
              Your Balance:
            </Text>
          </View>
          <Text style={styles.balanceAmount}>
            {balance} <Ionicons name="cash-outline" size={20} color="#38E07B" />
          </Text>
        </View>

        {/* Store Items */}
        {items.map((item) => (
          <View
            key={item.id}
            style={[styles.itemCard, darkMode && styles.cardDark]}
          >
            <View>
              <Text style={[styles.itemName, darkMode && styles.textDark]}>
                {item.name}
              </Text>
              <Text style={styles.itemPrice}>
                {item.price}{" "}
                <Ionicons name="cash-outline" size={16} color="#FACC15" />
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.buyButton,
                (loading || balance < item.price) && styles.buyButtonDisabled,
              ]}
              onPress={() => handlePurchase(item)}
              disabled={loading || balance < item.price}
            >
              {loading ? (
                <ActivityIndicator color="#111827" size="small" />
              ) : (
                <Text style={styles.buyButtonText}>Buy</Text>
              )}
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 2,
    borderBottomColor: "#38E07B",
  },
  headerDark: {
    backgroundColor: "#121212",
    borderBottomColor: "#38E07B",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#38E07B",
    flex: 1,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  balanceCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 24,
    alignItems: "center",
  },
  cardDark: {
    backgroundColor: "#1E1E1E",
    borderColor: "#2F2F2F",
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
  },
  textDark: {
    color: "#FFFFFF",
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "800",
    color: "#38E07B",
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FACC15",
  },
  buyButton: {
    backgroundColor: "#38E07B",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 80,
    alignItems: "center",
  },
  buyButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  buyButtonText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
  },
});
