import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import SignIn from "@/features/auth/SignIn";
import VerifyEmail from "@/features/auth/VerifyEmail";
import LandingPage from "@/features/marketing/LandingPage";
import AppLayout from "@/components/AppLayout";
import EntryScreen from "@/features/expenses/EntryScreen";
import HistoryScreen from "@/features/expenses/HistoryScreen";
import InsightsScreen from "@/features/insights/InsightsScreen";
import GroupsScreen from "@/features/groups/GroupsScreen";
import GroupDetailScreen from "@/features/groups/GroupDetailScreen";
import ProfileScreen from "@/features/profile/ProfileScreen";

function Splash() {
  return (
    <div className="flex h-full items-center justify-center text-muted">
      Loading…
    </div>
  );
}

export default function App() {
  const { user, loading, verified } = useAuth();

  if (loading) return <Splash />;
  if (!user)
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<SignIn />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  if (!verified) return <VerifyEmail />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<EntryScreen />} />
        <Route path="/history" element={<HistoryScreen />} />
        <Route path="/insights" element={<InsightsScreen />} />
        <Route path="/groups" element={<GroupsScreen />} />
        <Route path="/groups/:groupId" element={<GroupDetailScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
