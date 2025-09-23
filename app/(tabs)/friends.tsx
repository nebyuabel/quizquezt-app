// import React, { useState, useEffect, useCallback, useRef } from "react";
// import {
//   SafeAreaView,
//   Text,
//   View,
//   TouchableOpacity,
//   ActivityIndicator,
//   ScrollView,
//   Alert,
//   TextInput,
//   Image,
//   Modal,
// } from "react-native";
// import { router } from "expo-router";
// import { supabase } from "@/lib/supabaseClient";
// import { User } from "@supabase/supabase-js";
// import { useTheme } from "@/context/ThemeContext";
// import { Ionicons } from "@expo/vector-icons";

// // Interface for a user profile (for search results and friends list)
// interface UserProfile {
//   id: string;
//   username: string | null;
//   avatar_url: string | null;
//   xp: number; // Include XP to show alongside friends/search results
// }

// // Interface for a friend request
// interface FriendRequest {
//   id: string;
//   sender_id: string;
//   receiver_id: string;
//   status: "pending" | "accepted" | "declined";
//   created_at: string;
//   sender_username?: string; // Will be joined from profiles
//   sender_avatar_url?: string; // Will be joined from profiles
// }

// // Interface for a confirmed friendship
// interface Friendship {
//   id: string;
//   user1_id: string;
//   user2_id: string;
//   established_at: string;
//   friend_profile: UserProfile; // The profile of the other friend in the pair
// }

// export default function FriendsScreen() {
//   const { darkMode } = useTheme();
//   const [loading, setLoading] = useState(true);
//   const [currentUser, setCurrentUser] = useState<User | null>(null);

//   // States for Search Users tab
//   const [searchQuery, setSearchQuery] = useState("");
//   const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
//   const [searchLoading, setSearchLoading] = useState(false);
//   const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

//   // States for Requests tab
//   const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
//   const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);

//   // States for Friends List tab
//   const [friendsList, setFriendsList] = useState<Friendship[]>([]);

//   // Current active tab: 'search', 'requests', 'friends'
//   const [activeTab, setActiveTab] = useState("friends"); // Default to friends list

//   // State for profile modal
//   const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
//   const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);

//   // --- Initial Load & User Fetch ---
//   useEffect(() => {
//     const initializeUser = async () => {
//       setLoading(true);
//       try {
//         const { data: { user }, error: authError } = await supabase.auth.getUser();
//         if (authError) throw authError;
//         if (!user) {
//           router.replace("/");
//           return;
//         }
//         setCurrentUser(user);
//       } catch (error: any) {
//         console.error("FriendsScreen: User initialization error:", error);
//         Alert.alert("Error", `Failed to load user data: ${error.message}`);
//       } finally {
//         setLoading(false);
//       }
//     };
//     initializeUser();
//   }, []);

//   // --- Fetch Requests and Friends List ---
//   const fetchRequestsAndFriends = useCallback(async () => {
//     if (!currentUser) return;

//     setLoading(true); // Indicate overall loading for requests/friends
//     try {
//       // Fetch Incoming Requests
//       const { data: incomingReqs, error: incomingErr } = await supabase
//         .from("friend_requests")
//         .select(`
//           id, sender_id, receiver_id, status, created_at,
//           sender_profile:profiles!friend_requests_sender_id_fkey(username, avatar_url)
//         `)
//         .eq("receiver_id", currentUser.id)
//         .eq("status", "pending");

//       if (incomingErr) throw incomingErr;
//       setIncomingRequests(incomingReqs.map(req => ({
//         ...req,
//         sender_username: req.sender_profile?.username,
//         sender_avatar_url: req.sender_profile?.avatar_url,
//       })) as FriendRequest[]);

//       // Fetch Outgoing Requests
//       const { data: outgoingReqs, error: outgoingErr } = await supabase
//         .from("friend_requests")
//         .select(`
//           id, sender_id, receiver_id, status, created_at,
//           receiver_profile:profiles!friend_requests_receiver_id_fkey(username, avatar_url)
//         `)
//         .eq("sender_id", currentUser.id)
//         .eq("status", "pending");

//       if (outgoingErr) throw outgoingErr;
//       setOutgoingRequests(outgoingReqs.map(req => ({
//         ...req,
//         receiver_username: req.receiver_profile?.username, // Renamed for clarity on outgoing
//         receiver_avatar_url: req.receiver_profile?.avatar_url, // Renamed for clarity on outgoing
//       })) as FriendRequest[]);

//       // Fetch Friends List
//       const { data: friendships, error: friendsErr } = await supabase
//         .from("friends")
//         .select(`
//           id, user1_id, user2_id, established_at,
//           user1_profile:profiles!friends_user1_id_fkey(id, username, avatar_url, xp),
//           user2_profile:profiles!friends_user2_id_fkey(id, username, avatar_url, xp)
//         `)
//         .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`);

//       if (friendsErr) throw friendsErr;

//       const mappedFriends: Friendship[] = friendships.map(fs => {
//         // Determine which profile is the actual friend (not the current user)
//         const friendProfileData = fs.user1_id === currentUser.id ? fs.user2_profile : fs.user1_profile;
//         return {
//           id: fs.id,
//           user1_id: fs.user1_id,
//           user2_id: fs.user2_id,
//           established_at: fs.established_at,
//           friend_profile: {
//             id: friendProfileData.id,
//             username: friendProfileData.username,
//             avatar_url: friendProfileData.avatar_url,
//             xp: friendProfileData.xp,
//           },
//         };
//       });
//       setFriendsList(mappedFriends);

//     } catch (error: any) {
//       console.error("FriendsScreen: Error fetching requests/friends:", error);
//       Alert.alert("Error", `Failed to load friend data: ${error.message}`);
//     } finally {
//       setLoading(false);
//     }
//   }, [currentUser]);

//   // --- Realtime Subscriptions for Requests and Friends ---
//   useEffect(() => {
//     if (!currentUser) return;

//     // Realtime for Friend Requests
//     const requestsChannel = supabase
//       .channel("friend_requests_channel")
//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "friend_requests",
//           filter: `receiver_id=eq.${currentUser.id}`, // Listen for requests sent to current user
//         },
//         (payload) => {
//           console.log("Friend request change received:", payload.new);
//           fetchRequestsAndFriends(); // Re-fetch all data on change
//         }
//       )
//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "friend_requests",
//           filter: `sender_id=eq.${currentUser.id}`, // Listen for status updates on sent requests
//         },
//         (payload) => {
//           console.log("Outgoing request change received:", payload.new);
//           fetchRequestsAndFriends(); // Re-fetch all data on change
//         }
//       )
//       .subscribe();

//     // Realtime for Friends List
//     const friendsChannel = supabase
//       .channel("friends_channel")
//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "friends",
//           filter: `user1_id=eq.${currentUser.id}`, // Listen for changes where current user is user1
//         },
//         (payload) => {
//           console.log("Friendship change received (user1):", payload.new);
//           fetchRequestsAndFriends();
//         }
//       )
//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "friends",
//           filter: `user2_id=eq.${currentUser.id}`, // Listen for changes where current user is user2
//         },
//         (payload) => {
//           console.log("Friendship change received (user2):", payload.new);
//           fetchRequestsAndFriends();
//         }
//       )
//       .subscribe();

//     // Initial fetch when currentUser is available
//     fetchRequestsAndFriends();

//     return () => {
//       supabase.removeChannel(requestsChannel);
//       supabase.removeChannel(friendsChannel);
//     };
//   }, [currentUser, fetchRequestsAndFriends]); // Re-run if currentUser changes or fetch fn identity changes

//   // --- Search Users Functionality ---
//   useEffect(() => {
//     if (searchTimeoutRef.current) {
//       clearTimeout(searchTimeoutRef.current);
//     }
//     if (searchQuery.length < 3) { // Only search if query is at least 3 characters long
//       setSearchResults([]);
//       setSearchLoading(false);
//       return;
//     }

//     setSearchLoading(true);
//     searchTimeoutRef.current = setTimeout(async () => {
//       try {
//         const { data: profiles, error } = await supabase
//           .from("profiles")
//           .select("id, username, avatar_url, xp")
//           .ilike("username", `%${searchQuery}%`)
//           .neq("id", currentUser?.id); // Exclude current user from search results

//         if (error) throw error;
//         setSearchResults(profiles as UserProfile[]);
//       } catch (error: any) {
//         console.error("FriendsScreen: Error searching users:", error);
//         Alert.alert("Search Error", `Failed to search users: ${error.message}`);
//         setSearchResults([]);
//       } finally {
//         setSearchLoading(false);
//       }
//     }, 500); // Debounce search by 500ms

//     return () => {
//       if (searchTimeoutRef.current) {
//         clearTimeout(searchTimeoutRef.current);
//       }
//     };
//   }, [searchQuery, currentUser]); // Depend on searchQuery and currentUser

//   // --- Friend Request Actions ---
//   const sendFriendRequest = async (receiverId: string) => {
//     if (!currentUser) return;
//     try {
//       setLoading(true); // General loading for action
//       const { error } = await supabase
//         .from("friend_requests")
//         .insert({ sender_id: currentUser.id, receiver_id: receiverId, status: "pending" });

//       if (error) {
//         if (error.code === '23505') { // PostgreSQL unique violation code
//           Alert.alert("Request Failed", "A pending request to this user already exists or you are already friends.");
//         } else {
//           throw error;
//         }
//       } else {
//         Alert.alert("Success", "Friend request sent!");
//         setSearchQuery(""); // Clear search after sending request
//         setSearchResults([]); // Clear search results
//         fetchRequestsAndFriends(); // Re-fetch to update outgoing requests
//       }
//     } catch (error: any) {
//       console.error("Error sending request:", error.message);
//       Alert.alert("Error", `Failed to send friend request: ${error.message}`);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const acceptFriendRequest = async (requestId: string) => {
//     if (!currentUser) return;
//     try {
//       setLoading(true);
//       // Call the RPC function to accept the request and create friendship
//       const { error } = await supabase.rpc("accept_friend_request", { p_request_id: requestId });

//       if (error) throw error;
//       Alert.alert("Success", "Friend request accepted!");
//       fetchRequestsAndFriends(); // Re-fetch to update requests and friends list
//     } catch (error: any) {
//       console.error("Error accepting request:", error.message);
//       Alert.alert("Error", `Failed to accept friend request: ${error.message}`);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const declineFriendRequest = async (requestId: string) => {
//     if (!currentUser) return;
//     try {
//       setLoading(true);
//       const { error } = await supabase
//         .from("friend_requests")
//         .update({ status: "declined" }) // Update status to declined
//         .eq("id", requestId)
//         .eq("receiver_id", currentUser.id); // Ensure only receiver can decline

//       if (error) throw error;
//       Alert.alert("Declined", "Friend request declined.");
//       fetchRequestsAndFriends(); // Re-fetch to update requests
//     } catch (error: any) {
//       console.error("Error declining request:", error.message);
//       Alert.alert("Error", `Failed to decline friend request: ${error.message}`);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const removeFriend = async (friendshipId: string) => {
//     if (!currentUser) return;
//     Alert.alert(
//       "Remove Friend",
//       "Are you sure you want to remove this friend?",
//       [
//         {
//           text: "Cancel",
//           style: "cancel",
//         },
//         {
//           text: "Remove",
//           onPress: async () => {
//             setLoading(true);
//             try {
//               const { error } = await supabase
//                 .from("friends")
//                 .delete()
//                 .eq("id", friendshipId)
//                 .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`); // Ensure only involved users can delete

//               if (error) throw error;
//               Alert.alert("Success", "Friend removed successfully.");
//               fetchRequestsAndFriends(); // Re-fetch friends list
//             } catch (error: any) {
//               console.error("Error removing friend:", error.message);
//               Alert.alert("Error", `Failed to remove friend: ${error.message}`);
//             } finally {
//               setLoading(false);
//             }
//           },
//           style: "destructive",
//         },
//       ]
//     );
//   };

//   if (loading && !currentUser) { // Only show full screen loading if current user is not yet loaded
//     return (
//       <SafeAreaView className="flex-1 justify-center items-center bg-gray-900">
//         <ActivityIndicator size="large" color="#a78bfa" />
//         <Text className="text-purple-400 mt-4">Loading Friends...</Text>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView className={`flex-1 p-4 ${darkMode ? "bg-gray-900" : "bg-gray-100"}`}>
//       <Text className={`text-3xl font-bold mb-6 text-center ${darkMode ? "text-white" : "text-black"}`}>
//         Friends
//       </Text>

//       {/* Tab Navigation */}
//       <View className="flex-row justify-around mb-6 bg-gray-800 rounded-lg p-1">
//         <TouchableOpacity
//           className={`flex-1 p-3 rounded-md items-center ${
//             activeTab === "friends" ? "bg-purple-600" : ""
//           }`}
//           onPress={() => setActiveTab("friends")}
//         >
//           <Text className="text-white font-bold">Friends</Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           className={`flex-1 p-3 rounded-md items-center ${
//             activeTab === "requests" ? "bg-purple-600" : ""
//           }`}
//           onPress={() => setActiveTab("requests")}
//         >
//           <Text className="text-white font-bold">Requests ({incomingRequests.length})</Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           className={`flex-1 p-3 rounded-md items-center ${
//             activeTab === "search" ? "bg-purple-600" : ""
//           }`}
//           onPress={() => setActiveTab("search")}
//         >
//           <Text className="text-white font-bold">Search</Text>
//         </TouchableOpacity>
//       </View>

//       <ScrollView className="flex-1">
//         {/* Friends List Tab */}
//         {activeTab === "friends" && (
//           <View>
//             <Text className={`text-xl font-bold mb-4 ${darkMode ? "text-white" : "text-black"}`}>
//               My Friends
//             </Text>
//             {loading && friendsList.length === 0 ? (
//               <ActivityIndicator size="small" color="#a78bfa" />
//             ) : friendsList.length === 0 ? (
//               <Text className={darkMode ? "text-gray-400" : "text-gray-600"}>
//                 You don't have any friends yet. Find some!
//               </Text>
//             ) : (
//               friendsList.map((friendship) => (
//                 <View
//                   key={friendship.id}
//                   className={`p-3 rounded-lg mb-2 flex-row items-center justify-between border ${
//                     darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-300"
//                   }`}
//                 >
//                   <TouchableOpacity
//                     className="flex-row items-center flex-1"
//                     onPress={() => {
//                         // Open profile modal for the friend
//                         setSelectedProfile(friendship.friend_profile);
//                         setIsProfileModalVisible(true);
//                     }}
//                   >
//                     {friendship.friend_profile.avatar_url ? (
//                       <Image source={{ uri: friendship.friend_profile.avatar_url }} className="w-10 h-10 rounded-full mr-3" />
//                     ) : (
//                       <View className="w-10 h-10 rounded-full bg-gray-600 justify-center items-center mr-3">
//                         <Text className="text-white text-lg">
//                           {friendship.friend_profile.username?.[0]?.toUpperCase() ?? "?"}
//                         </Text>
//                       </View>
//                     )}
//                     <View>
//                         <Text className={`text-lg font-bold ${darkMode ? "text-white" : "text-black"}`}>
//                         {friendship.friend_profile.username || "Unknown User"}
//                         </Text>
//                         <Text className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
//                         XP: {friendship.friend_profile.xp}
//                         </Text>
//                     </View>
//                   </TouchableOpacity>
//                   <TouchableOpacity
//                     className="bg-red-600 p-2 rounded-lg"
//                     onPress={() => removeFriend(friendship.id)}
//                   >
//                     <Text className="text-white text-xs">Remove</Text>
//                   </TouchableOpacity>
//                 </View>
//               ))
//             )}
//           </View>
//         )}

//         {/* Requests Tab */}
//         {activeTab === "requests" && (
//           <View>
//             <Text className={`text-xl font-bold mb-4 ${darkMode ? "text-white" : "text-black"}`}>
//               Incoming Requests ({incomingRequests.length})
//             </Text>
//             {loading && incomingRequests.length === 0 ? (
//               <ActivityIndicator size="small" color="#a78bfa" />
//             ) : incomingRequests.length === 0 ? (
//               <Text className={darkMode ? "text-gray-400" : "text-gray-600"}>
//                 No pending incoming friend requests.
//               </Text>
//             ) : (
//               incomingRequests.map((request) => (
//                 <View
//                   key={request.id}
//                   className={`p-3 rounded-lg mb-2 flex-row items-center justify-between border ${
//                     darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-300"
//                   }`}
//                 >
//                   <View className="flex-row items-center flex-1">
//                     {request.sender_avatar_url ? (
//                       <Image source={{ uri: request.sender_avatar_url }} className="w-10 h-10 rounded-full mr-3" />
//                     ) : (
//                       <View className="w-10 h-10 rounded-full bg-gray-600 justify-center items-center mr-3">
//                         <Text className="text-white text-lg">
//                           {request.sender_username?.[0]?.toUpperCase() ?? "?"}
//                         </Text>
//                       </View>
//                     )}
//                     <Text className={`text-lg font-bold ${darkMode ? "text-white" : "text-black"}`}>
//                       {request.sender_username || "Unknown User"}
//                     </Text>
//                   </View>
//                   <View className="flex-row">
//                     <TouchableOpacity
//                       className="bg-green-600 p-2 rounded-lg mr-2"
//                       onPress={() => acceptFriendRequest(request.id)}
//                       disabled={loading}
//                     >
//                       <Text className="text-white text-xs">Accept</Text>
//                     </TouchableOpacity>
//                     <TouchableOpacity
//                       className="bg-red-600 p-2 rounded-lg"
//                       onPress={() => declineFriendRequest(request.id)}
//                       disabled={loading}
//                     >
//                       <Text className="text-white text-xs">Decline</Text>
//                     </TouchableOpacity>
//                   </View>
//                 </View>
//               ))
//             )}

//             <Text className={`text-xl font-bold mt-6 mb-4 ${darkMode ? "text-white" : "text-black"}`}>
//               Outgoing Requests
//             </Text>
//             {loading && outgoingRequests.length === 0 ? (
//               <ActivityIndicator size="small" color="#a78bfa" />
//             ) : outgoingRequests.length === 0 ? (
//               <Text className={darkMode ? "text-gray-400" : "text-gray-600"}>
//                 No pending outgoing friend requests.
//               </Text>
//             ) : (
//               outgoingRequests.map((request) => (
//                 <View
//                   key={request.id}
//                   className={`p-3 rounded-lg mb-2 flex-row items-center justify-between border ${
//                     darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-300"
//                   }`}
//                 >
//                   <View className="flex-row items-center flex-1">
//                     {request.receiver_avatar_url ? (
//                       <Image source={{ uri: request.receiver_avatar_url }} className="w-10 h-10 rounded-full mr-3" />
//                     ) : (
//                       <View className="w-10 h-10 rounded-full bg-gray-600 justify-center items-center mr-3">
//                         <Text className="text-white text-lg">
//                           {request.receiver_username?.[0]?.toUpperCase() ?? "?"}
//                         </Text>
//                       </View>
//                     )}
//                     <Text className={`text-lg font-bold ${darkMode ? "text-white" : "text-black"}`}>
//                       {request.receiver_username || "Unknown User"}
//                     </Text>
//                   </View>
//                   <Text className={darkMode ? "text-gray-400 text-sm" : "text-gray-600 text-sm"}>
//                     Pending
//                   </Text>
//                 </View>
//               ))
//             )}
//           </View>
//         )}

//         {/* Search Tab */}
//         {activeTab === "search" && (
//           <View>
//             <TextInput
//               className={`p-3 rounded-lg mb-4 border ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-100 border-gray-300 text-black"}`}
//               placeholder="Search for users by username..."
//               placeholderTextColor={darkMode ? "#a78bfa" : "#888"}
//               value={searchQuery}
//               onChangeText={setSearchQuery}
//               autoCapitalize="none"
//             />
//             {searchLoading ? (
//               <ActivityIndicator size="large" color="#a78bfa" className="mt-4" />
//             ) : searchResults.length > 0 ? (
//               searchResults.map((userProfile) => (
//                 <View
//                   key={userProfile.id}
//                   className={`p-3 rounded-lg mb-2 flex-row items-center justify-between border ${
//                     darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-300"
//                   }`}
//                 >
//                   <TouchableOpacity
//                     className="flex-row items-center flex-1"
//                     onPress={() => {
//                         setSelectedProfile(userProfile);
//                         setIsProfileModalVisible(true);
//                     }}
//                   >
//                     {userProfile.avatar_url ? (
//                       <Image source={{ uri: userProfile.avatar_url }} className="w-10 h-10 rounded-full mr-3" />
//                     ) : (
//                       <View className="w-10 h-10 rounded-full bg-gray-600 justify-center items-center mr-3">
//                         <Text className="text-white text-lg">
//                           {userProfile.username?.[0]?.toUpperCase() ?? "?"}
//                         </Text>
//                       </View>
//                     )}
//                     <View>
//                         <Text className={`text-lg font-bold ${darkMode ? "text-white" : "text-black"}`}>
//                         {userProfile.username || "Unknown User"}
//                         </Text>
//                         <Text className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
//                         XP: {userProfile.xp}
//                         </Text>
//                     </View>
//                   </TouchableOpacity>
//                   <TouchableOpacity
//                     className="bg-purple-600 p-2 rounded-lg"
//                     onPress={() => sendFriendRequest(userProfile.id)}
//                     disabled={loading}
//                   >
//                     <Text className="text-white text-xs">Add Friend</Text>
//                   </TouchableOpacity>
//                 </View>
//               ))
//             ) : searchQuery.length >= 3 && !searchLoading ? (
//               <Text className={darkMode ? "text-gray-400 text-center mt-4" : "text-gray-600 text-center mt-4"}>
//                 No users found for "{searchQuery}".
//               </Text>
//             ) : (
//                 <Text className={darkMode ? "text-gray-400 text-center mt-4" : "text-gray-600 text-center mt-4"}>
//                   Type at least 3 characters to search for users.
//                 </Text>
//             )}
//           </View>
//         )}
//       </ScrollView>

//       {/* Profile Details Modal (reused from leaderboard for consistency) */}
//       <Modal
//         animationType="fade"
//         transparent={true}
//         visible={isProfileModalVisible}
//         onRequestClose={() => setIsProfileModalVisible(false)}
//       >
//         <TouchableOpacity
//           className="flex-1 justify-center items-center bg-black/70 p-4"
//           activeOpacity={1}
//           onPress={() => setIsProfileModalVisible(false)}
//         >
//           {selectedProfile && (
//             <View className="w-full max-w-sm bg-gray-800 rounded-lg p-6 border border-purple-700">
//               <TouchableOpacity
//                 onPress={() => setIsProfileModalVisible(false)}
//                 className="absolute top-3 right-3 p-1 rounded-full bg-gray-700 z-10"
//               >
//                 <Ionicons name="close-circle" size={28} color="#a78bfa" />
//               </TouchableOpacity>

//               <View className="items-center mb-4">
//                 {selectedProfile.avatar_url ? (
//                   <Image
//                     source={{ uri: selectedProfile.avatar_url }}
//                     className="w-24 h-24 rounded-full border-2 border-purple-500 mb-2"
//                   />
//                 ) : (
//                   <View className="w-24 h-24 rounded-full bg-gray-700 justify-center items-center border-2 border-purple-500 mb-2">
//                     <Text className="text-white text-4xl">
//                       {selectedProfile.username?.[0]?.toUpperCase() ?? "?"}
//                     </Text>
//                   </View>
//                 )}
//                 <Text className="text-white text-2xl font-bold">
//                   {selectedProfile.username || "N/A"}
//                 </Text>
//                 <Text className="text-purple-400 text-lg mt-1">
//                   XP: {selectedProfile.xp}
//                 </Text>
//               </View>

//               {/* You can add more profile details here if available, e.g., current streak, tiers etc. */}
//               {/* For simplicity, only XP is shown in this modal as it's the most common profile data passed */}
//               {/* To show full details like streak and tiers, you'd need to fetch the full profile by ID */}
//               <TouchableOpacity
//                 className="bg-purple-600 p-3 rounded-lg items-center mt-4"
//                 onPress={() => {
//                   setIsProfileModalVisible(false);
//                   // Optionally navigate to a full profile view screen if you create one
//                   // router.push({ pathname: "/(tabs)/user-profile", params: { userId: selectedProfile.id } });
//                   Alert.alert("Feature Coming Soon", "Full user profile view is coming soon!");
//                 }}
//               >
//                 <Text className="text-white font-bold">View Full Profile</Text>
//               </TouchableOpacity>
//             </View>
//           )}
//         </TouchableOpacity>
//       </Modal>
//     </SafeAreaView>
//   );
// }
