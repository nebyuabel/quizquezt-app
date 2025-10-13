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
  Dimensions,
} from "react-native";
import { useAppContext } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabaseClient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

const { width } = Dimensions.get("window");

// Define types
interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  type: "freeze" | "xp_boost" | "cosmetic";
  duration?: number;
  icon: string;
  gradient: string[];
}

export default function StoreScreen() {
  const { darkMode } = useAppContext();
  const [items] = useState<StoreItem[]>([
    {
      id: "freeze1",
      name: "Streak Freeze",
      description: "Protect your streak for one day",
      price: 50,
      type: "freeze",
      icon: "snow",
      gradient: ["#667eea", "#764ba2"],
    },
    {
      id: "xpboost1",
      name: "XP Boost",
      description: "5 uses of double XP",
      price: 100,
      type: "xp_boost",
      duration: 5,
      icon: "rocket",
      gradient: ["#f093fb", "#f5576c"],
    },
    {
      id: "premium1",
      name: "Premium Avatar",
      description: "Exclusive animated avatar",
      price: 200,
      type: "cosmetic",
      icon: "sparkles",
      gradient: ["#4facfe", "#00f2fe"],
    },
  ]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

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
        `You need ${item.price - balance} more coins to buy ${item.name}.`
      );
      return;
    }

    setPurchasingId(item.id);
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
      }

      setBalance(newBalance);
      Alert.alert(
        "Purchase Successful! 🎉",
        `${item.name} has been added to your account!`
      );
    } catch (error: any) {
      console.error("Purchase error:", error.message);
      Alert.alert("Error", "Failed to complete purchase. Please try again.");
    } finally {
      setPurchasingId(null);
    }
  };

  const getIconName = (icon: string) => {
    const icons: { [key: string]: string } = {
      snow: "snow",
      rocket: "rocket-outline",
      sparkles: "sparkles",
    };
    return icons[icon] || "cube-outline";
  };

  return (
    <SafeAreaView style={[styles.container, darkMode && styles.containerDark]}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={darkMode ? ["#0f172a", "#1e293b"] : ["#38E07B", "#22c55e"]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Store</Text>
            <Text style={styles.headerSubtitle}>Premium Items & Boosts</Text>
          </View>
          <View style={styles.coinBadge}>
            <Ionicons name="sparkles" size={16} color="#FACC15" />
            <Text style={styles.coinText}>{balance}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Balance Card */}
        <View style={[styles.balanceCard, darkMode && styles.balanceCardDark]}>
          <LinearGradient
            colors={["#38E07B", "#22c55e"]}
            style={styles.balanceGradient}
          >
            <View style={styles.balanceContent}>
              <View style={styles.balanceInfo}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <Text style={styles.balanceAmount}>{balance} Coins</Text>
              </View>
              <View style={styles.coinIcon}>
                <Ionicons name="cash" size={32} color="#FFFFFF" />
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Featured Items */}
        <Text
          style={[styles.sectionTitle, darkMode && styles.sectionTitleDark]}
        >
          Featured Items
        </Text>

        {items.map((item) => (
          <View key={item.id} style={styles.itemWrapper}>
            <LinearGradient
              colors={item.gradient}
              style={[styles.itemCard, darkMode && styles.itemCardDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.itemContent}>
                <View style={styles.itemIconContainer}>
                  <Ionicons
                    name={getIconName(item.icon)}
                    size={32}
                    color="#FFFFFF"
                  />
                </View>

                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                  <View style={styles.priceContainer}>
                    <Ionicons name="cash" size={16} color="#FACC15" />
                    <Text style={styles.itemPrice}>{item.price}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.buyButton,
                    balance < item.price && styles.buyButtonDisabled,
                  ]}
                  onPress={() => handlePurchase(item)}
                  disabled={balance < item.price || purchasingId === item.id}
                >
                  {purchasingId === item.id ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.buyButtonText}>
                      {balance < item.price ? "Need Coins" : "Purchase"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        ))}

        {/* Coming Soon Section */}
        <View
          style={[styles.comingSoonCard, darkMode && styles.comingSoonCardDark]}
        >
          <Ionicons name="time-outline" size={32} color="#6b7280" />
          <Text
            style={[
              styles.comingSoonText,
              darkMode && styles.comingSoonTextDark,
            ]}
          >
            More exciting items coming soon!
          </Text>
          <Text
            style={[
              styles.comingSoonSubtext,
              darkMode && styles.comingSoonSubtextDark,
            ]}
          >
            Check back regularly for new boosts and cosmetics
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  containerDark: {
    backgroundColor: "#0f172a",
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    alignItems: "center",
    flex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#e2e8f0",
    fontWeight: "500",
  },
  coinBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  coinText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  balanceCard: {
    borderRadius: 20,
    marginBottom: 30,
    shadowColor: "#38E07B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  balanceCardDark: {
    shadowColor: "#38E07B",
  },
  balanceGradient: {
    borderRadius: 20,
    padding: 24,
  },
  balanceContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    opacity: 0.9,
  },
  balanceAmount: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
  },
  coinIcon: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 12,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 20,
  },
  sectionTitleDark: {
    color: "#f1f5f9",
  },
  itemWrapper: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  itemCard: {
    borderRadius: 20,
    padding: 20,
  },
  itemCardDark: {
    shadowColor: "#000",
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  itemIconContainer: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 12,
    borderRadius: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  itemDescription: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  itemPrice: {
    color: "#FACC15",
    fontSize: 18,
    fontWeight: "700",
  },
  buyButton: {
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 100,
    alignItems: "center",
  },
  buyButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  buyButtonText: {
    color: "#1e293b",
    fontSize: 14,
    fontWeight: "700",
  },
  comingSoonCard: {
    backgroundColor: "#f1f5f9",
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 20,
  },
  comingSoonCardDark: {
    backgroundColor: "#1e293b",
  },
  comingSoonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#475569",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  comingSoonTextDark: {
    color: "#cbd5e1",
  },
  comingSoonSubtext: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
  },
  comingSoonSubtextDark: {
    color: "#94a3b8",
  },
});
