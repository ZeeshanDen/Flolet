// Local notification scheduling — no server, works offline.
// Reschedules everything from current data: dose-time reminders per slot,
// weekly-injection reminders, and a refill warning 5 days before run-out.

import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseISO, subDays, format } from "date-fns";
import { runOutDate, daysLeft, remainingUnits } from "./medsCalc";
import type { Medicine, MedSlot } from "../../lib/types";

const ENABLED_KEY = "flowlet-reminders-enabled";

export const SLOT_TIMES: Record<MedSlot, { hour: number; minute: number }> = {
  morning: { hour: 8, minute: 0 },
  afternoon: { hour: 13, minute: 0 },
  evening: { hour: 18, minute: 0 },
  night: { hour: 21, minute: 0 },
};
const WEEKLY_TIME = { hour: 9, minute: 0 };
const REFILL_TIME = { hour: 10, minute: 0 };
const REFILL_WARN_DAYS = 5;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function remindersEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ENABLED_KEY)) === "1";
  } catch {
    return false;
  }
}

export async function setRemindersEnabled(on: boolean): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, on ? "1" : "0");
  if (!on) await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function requestPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/** Wipe + reschedule everything from the given medicines. */
export async function rescheduleAll(medicines: Medicine[]): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  let count = 0;

  // Group dose reminders by slot so 4 medicines ≠ 4 separate 9pm pings.
  const bySlot = new Map<MedSlot, string[]>();
  const byWeekday = new Map<number, string[]>();
  for (const m of medicines) {
    if (remainingUnits(m) <= 0) continue; // out of stock → only refill nag
    if (m.schedule.type === "daily") {
      for (const s of m.schedule.slots) {
        bySlot.set(s, [...(bySlot.get(s) ?? []), m.name]);
      }
    } else {
      byWeekday.set(m.schedule.weekday, [
        ...(byWeekday.get(m.schedule.weekday) ?? []),
        m.name,
      ]);
    }
  }

  for (const [slot, names] of bySlot) {
    const t = SLOT_TIMES[slot];
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${slot[0].toUpperCase() + slot.slice(1)} medicines`,
        body: names.join(", "),
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: t.hour,
        minute: t.minute,
      },
    });
    count++;
  }

  for (const [weekday, names] of byWeekday) {
    await Notifications.scheduleNotificationAsync({
      content: { title: "Weekly medicine", body: names.join(", "), sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: weekday + 1, // expo: 1 = Sunday
        hour: WEEKLY_TIME.hour,
        minute: WEEKLY_TIME.minute,
      },
    });
    count++;
  }

  // Refill warnings: one dated ping per medicine, 5 days before run-out.
  const now = new Date();
  for (const m of medicines) {
    const out = runOutDate(m);
    const warnAt = subDays(parseISO(out), REFILL_WARN_DAYS);
    warnAt.setHours(REFILL_TIME.hour, REFILL_TIME.minute, 0, 0);
    const left = daysLeft(m);
    const body =
      left <= 0
        ? `${m.name} is out of stock — reorder now`
        : `${m.name} runs out on ${format(parseISO(out), "d MMM")} — reorder soon`;
    // Already inside the warning window (or out): ping tomorrow morning.
    const fireAt =
      warnAt > now
        ? warnAt
        : (() => {
            const t = new Date(now);
            t.setDate(t.getDate() + 1);
            t.setHours(REFILL_TIME.hour, REFILL_TIME.minute, 0, 0);
            return t;
          })();
    await Notifications.scheduleNotificationAsync({
      content: { title: "Refill needed", body, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
      },
    });
    count++;
  }

  return count;
}
