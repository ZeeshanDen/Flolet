import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { AuthProvider, useAuth } from "./src/features/auth/AuthContext";
import { useVault, initVault } from "./src/features/vault/vault";
import {
  SignInScreen,
  VerifyScreen,
  UnlockScreen,
} from "./src/screens/AuthScreens";
import EntryScreen from "./src/screens/EntryScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import InsightsScreen from "./src/screens/InsightsScreen";
import MedsScreen from "./src/screens/MedsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import { C } from "./src/lib/theme";

type IonName = ComponentProps<typeof Ionicons>["name"];
const icon =
  (name: IonName) =>
  ({ color }: { color: string }) => (
    <Ionicons name={name} size={22} color={color} />
  );

const Tab = createBottomTabNavigator();

function Splash() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: C.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ActivityIndicator color={C.brand} size="large" />
    </View>
  );
}

function Root() {
  const { user, loading, verified } = useAuth();
  const vault = useVault();

  useEffect(() => {
    if (user && verified) initVault(user.uid);
  }, [user?.uid, verified]);

  if (loading) return <Splash />;
  if (!user) return <SignInScreen />;
  if (!verified) return <VerifyScreen />;
  if (vault.status === "loading") return <Splash />;
  if (vault.status === "locked") return <UnlockScreen />;

  return (
    <NavigationContainer
      theme={{
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: C.bg,
          card: C.surface,
          border: C.border,
          primary: C.brandSoft,
          text: C.text,
        },
      }}
    >
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: C.brandSoft,
          tabBarInactiveTintColor: C.muted,
          tabBarStyle: { backgroundColor: C.surface, borderTopColor: C.border },
        }}
      >
        <Tab.Screen
          name="Add"
          component={EntryScreen}
          options={{ tabBarIcon: icon("add-circle") }}
        />
        <Tab.Screen
          name="History"
          component={HistoryScreen}
          options={{ tabBarIcon: icon("list") }}
        />
        <Tab.Screen
          name="Insights"
          component={InsightsScreen}
          options={{ tabBarIcon: icon("pie-chart") }}
        />
        <Tab.Screen
          name="Meds"
          component={MedsScreen}
          options={{ tabBarIcon: icon("medkit") }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ tabBarIcon: icon("person") }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
