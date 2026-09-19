import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Wallet } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import SignIn from "@/features/auth/SignIn";
import VerifyEmail from "@/features/auth/VerifyEmail";
import UnlockVault from "@/features/vault/UnlockVault";
import { useVault } from "@/features/vault/vaultStore";
import AppLayout from "@/components/AppLayout";
import EntryScreen from "@/features/expenses/EntryScreen";
import HistoryScreen from "@/features/expenses/HistoryScreen";
import MedsScreen from "@/features/meds/MedsScreen";
import ProfileScreen from "@/features/profile/ProfileScreen";

// Lazy: not needed for the first paint. Insights pulls the chart library
// (its own chunk); Landing only matters logged-out.
const InsightsScreen = lazy(() => import("@/features/insights/InsightsScreen"));
const GroupsScreen = lazy(() => import("@/features/groups/GroupsScreen"));
const GroupDetailScreen = lazy(
  () => import("@/features/groups/GroupDetailScreen"),
);
const LandingPage = lazy(() => import("@/features/marketing/LandingPage"));

// Mirrors the static #splash in index.html so launch feels like one screen.
function Splash() {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-3.5"
      role="status"
      aria-label="Loading"
    >
      <div className="flex h-[72px] w-[72px] animate-[splashPulse_1.6s_ease-in-out_infinite] items-center justify-center rounded-[20px] bg-brand">
        <Wallet size={40} className="text-white" />
      </div>
      <div className="text-xl font-bold tracking-tight">Flowlet</div>
    </div>
  );
}

export default function App() {
  const { user, loading, verified } = useAuth();
  const vault = useVault();

  // Resolve vault state once the user is signed in + verified.
  useEffect(() => {
    if (user && verified) vault.init(user.uid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, verified]);

  if (loading) return <Splash />;
  if (!user)
    return (
      <Suspense fallback={<Splash />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<SignIn />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    );
  if (!verified) return <VerifyEmail />;
  if (vault.status === "loading") return <Splash />;
  if (vault.status === "locked") return <UnlockVault />;

  return (
    <Suspense fallback={<Splash />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<EntryScreen />} />
          <Route path="/history" element={<HistoryScreen />} />
          <Route path="/insights" element={<InsightsScreen />} />
          <Route path="/meds" element={<MedsScreen />} />
          <Route path="/groups" element={<GroupsScreen />} />
          <Route path="/groups/:groupId" element={<GroupDetailScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
