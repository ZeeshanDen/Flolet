import { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, G } from "react-native-svg";
import { format, addMonths, addYears } from "date-fns";
import {
  useExpenses,
  useCategories,
  useProfile,
} from "../features/expenses/useExpenses";
import { formatMoney } from "../lib/utils";
import { C } from "../lib/theme";

type ViewMode = "month" | "year";

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, rOuter: number, rInner: number, a0: number, a1: number) {
  const large = a1 - a0 > 180 ? 1 : 0;
  const p1 = polar(cx, cy, rOuter, a0);
  const p2 = polar(cx, cy, rOuter, a1);
  const p3 = polar(cx, cy, rInner, a1);
  const p4 = polar(cx, cy, rInner, a0);
  return `M ${p1.x} ${p1.y} A ${rOuter} ${rOuter} 0 ${large} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rInner} ${rInner} 0 ${large} 0 ${p4.x} ${p4.y} Z`;
}

export default function InsightsScreen() {
  const { expenses } = useExpenses();
  const { categories } = useCategories();
  const { currency } = useProfile();
  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(new Date());

  const catById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );

  const prefix =
    view === "month" ? format(cursor, "yyyy-MM") : format(cursor, "yyyy");
  const prevPrefix =
    view === "month"
      ? format(addMonths(cursor, -1), "yyyy-MM")
      : format(addYears(cursor, -1), "yyyy");

  const period = expenses.filter((e) => e.date.startsWith(prefix));
  const prev = expenses.filter((e) => e.date.startsWith(prevPrefix));
  const total = period.reduce((s, e) => s + e.amount, 0);
  const prevTotal = prev.reduce((s, e) => s + e.amount, 0);
  const delta = prevTotal === 0 ? 0 : ((total - prevTotal) / prevTotal) * 100;

  const slices = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of period)
      totals.set(e.categoryId, (totals.get(e.categoryId) ?? 0) + e.amount);
    return [...totals.entries()]
      .map(([id, value]) => ({
        id,
        name: catById[id]?.name ?? "Other",
        color: catById[id]?.color ?? "#94a3b8",
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [period, catById]);

  const buckets = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of period) {
      const key = view === "month" ? e.date : e.date.slice(0, 7);
      map.set(key, (map.get(key) ?? 0) + e.amount);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  }, [period, view]);
  const maxBucket = Math.max(1, ...buckets.map(([, v]) => v));

  // Donut geometry
  let angle = 0;
  const arcs = slices.map((sl) => {
    const sweep = total > 0 ? (sl.value / total) * 360 : 0;
    const a0 = angle;
    angle += sweep;
    return { ...sl, a0, a1: angle };
  });

  const step = (dir: number) =>
    setCursor((c) => (view === "month" ? addMonths(c, dir) : addYears(c, dir)));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={{ color: C.text, fontSize: 22, fontWeight: "800", marginBottom: 12 }}>
          Insights
        </Text>

        <View
          style={{
            flexDirection: "row",
            backgroundColor: C.surface,
            borderRadius: 12,
            padding: 4,
            marginBottom: 12,
          }}
        >
          {(["month", "year"] as ViewMode[]).map((v) => (
            <TouchableOpacity
              key={v}
              onPress={() => setView(v)}
              style={{
                flex: 1,
                padding: 9,
                borderRadius: 9,
                alignItems: "center",
                backgroundColor: view === v ? C.brand : "transparent",
              }}
            >
              <Text style={{ color: view === v ? "#fff" : C.muted, fontWeight: "600" }}>
                {v === "month" ? "Monthly" : "Yearly"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <TouchableOpacity onPress={() => step(-1)} style={{ padding: 8 }}>
            <Ionicons name="chevron-back" size={20} color={C.muted} />
          </TouchableOpacity>
          <Text style={{ color: C.text, fontWeight: "700", fontSize: 16 }}>
            {view === "month" ? format(cursor, "MMMM yyyy") : format(cursor, "yyyy")}
          </Text>
          <TouchableOpacity onPress={() => step(1)} style={{ padding: 8 }}>
            <Ionicons name="chevron-forward" size={20} color={C.muted} />
          </TouchableOpacity>
        </View>

        {/* Total */}
        <View
          style={{
            backgroundColor: C.card,
            borderColor: C.border,
            borderWidth: 1,
            borderRadius: 16,
            padding: 16,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ color: C.muted, fontSize: 13 }}>Total spent</Text>
          <Text style={{ color: C.text, fontSize: 30, fontWeight: "800", marginTop: 2 }}>
            {formatMoney(total, currency)}
          </Text>
          {prevTotal > 0 && (
            <Text
              style={{
                color: delta > 0 ? C.bad : C.good,
                fontSize: 13,
                marginTop: 4,
              }}
            >
              {delta > 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(0)}% vs last {view}
            </Text>
          )}
        </View>

        {period.length === 0 ? (
          <Text style={{ color: C.muted, textAlign: "center", marginTop: 30 }}>
            No spending in this period.
          </Text>
        ) : (
          <>
            {/* Donut */}
            <View
              style={{
                backgroundColor: C.card,
                borderColor: C.border,
                borderWidth: 1,
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <Text style={{ color: C.muted, fontSize: 13, marginBottom: 10 }}>
                By category
              </Text>
              <View style={{ alignItems: "center" }}>
                <Svg width={190} height={190}>
                  <G>
                    {arcs.map((a) =>
                      a.a1 - a.a0 >= 359.9 ? (
                        <G key={a.id}>
                          <Path d={arcPath(95, 95, 85, 55, 0, 180)} fill={a.color} />
                          <Path d={arcPath(95, 95, 85, 55, 180, 360)} fill={a.color} />
                        </G>
                      ) : (
                        <Path
                          key={a.id}
                          d={arcPath(95, 95, 85, 55, a.a0 + 1, a.a1)}
                          fill={a.color}
                        />
                      ),
                    )}
                  </G>
                </Svg>
              </View>
              <View style={{ marginTop: 10, gap: 7 }}>
                {slices.map((sl) => (
                  <View
                    key={sl.id}
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: sl.color }} />
                      <Text style={{ color: C.text, fontSize: 14 }}>{sl.name}</Text>
                    </View>
                    <Text style={{ color: C.muted, fontSize: 13 }}>
                      {formatMoney(sl.value, currency)} ({((sl.value / total) * 100).toFixed(0)}%)
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Bars */}
            <View
              style={{
                backgroundColor: C.card,
                borderColor: C.border,
                borderWidth: 1,
                borderRadius: 16,
                padding: 16,
              }}
            >
              <Text style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>
                {view === "month" ? "Daily spend" : "Monthly spend"}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-end",
                  height: 120,
                  gap: 3,
                }}
              >
                {buckets.map(([key, v]) => (
                  <View key={key} style={{ flex: 1, alignItems: "center" }}>
                    <View
                      style={{
                        width: "100%",
                        height: Math.max(4, (v / maxBucket) * 110),
                        backgroundColor: C.brand,
                        borderTopLeftRadius: 4,
                        borderTopRightRadius: 4,
                      }}
                    />
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                <Text style={{ color: C.muted, fontSize: 11 }}>
                  {buckets[0]?.[0].slice(view === "month" ? 8 : 5)}
                </Text>
                <Text style={{ color: C.muted, fontSize: 11 }}>
                  {buckets[buckets.length - 1]?.[0].slice(view === "month" ? 8 : 5)}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
