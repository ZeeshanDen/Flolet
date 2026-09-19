import { useEffect } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/features/auth/AuthContext";
import { useVault, initVault } from "./src/features/vault/vault";
import {
  SignInScreen,
  VerifyScreen,
  UnlockScreen,
} from "./src/screens/AuthScreens";
import MedsScreen from "./src/screens/MedsScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import { C } from "./src/lib/theme";

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
          name="Meds"
          component={MedsScreen}
          options={{
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 20, color }}>💊</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 20, color }}>⚙️</Text>
            ),
          }}
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
