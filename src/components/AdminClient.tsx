"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";

import { dayTypeLabel } from "@/lib/date-utils";

type Period = {
  id: number;
  order: number;
  dayType: string;
  name?: string;
  startTime: string;
  endTime: string;
};

type SettingsShape = {
  schoolName: string;
  managerName: string;
  currentDayType: string;
};

type Props = {
  authed: boolean;
  settings: SettingsShape;
  onSitePeriods: Period[];
  remotePeriods: Period[];
};

export const AdminClient = ({
  authed,
  settings,
  onSitePeriods,
  remotePeriods,
}: Props) => {
  const [isAuthed, setIsAuthed] = useState(authed);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [header, setHeader] = useState({
    schoolName: settings.schoolName,
    managerName: settings.managerName,
  });
  const [currentDayType, setCurrentDayType] = useState(settings.currentDayType);
  const [editDayType, setEditDayType] = useState<"ON_SITE" | "REMOTE">(
    "ON_SITE",
  );
  const [periods, setPeriods] = useState<Record<string, Period[]>>({
    ON_SITE: onSitePeriods,
    REMOTE: remotePeriods,
  });
  const [passwords, setPasswords] = useState({
    current: "",
    next: "",
  });
  const [loggingOut, setLoggingOut] = useState(false);

  const editingPeriods = useMemo(() => {
    return [...periods[editDayType]].sort((a, b) => a.order - b.order);
  }, [editDayType, periods]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setBusy(false);

    if (res.ok) {
      setIsAuthed(true);
      setMessage("تم تسجيل الدخول بنجاح");
    } else {
      setError("كلمة المرور غير صحيحة");
    }
  };

  const saveHeader = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);

    const res = await fetch("/api/admin/update-header", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(header),
    });

    setBusy(false);

    if (res.ok) {
      setMessage("تم تحديث بيانات الرأس");
    } else {
      setError("تعذر تحديث البيانات");
    }
  };

  const saveDayType = async (value: "ON_SITE" | "REMOTE") => {
    setCurrentDayType(value);
    setBusy(true);
    setMessage(null);
    setError(null);

    const res = await fetch("/api/admin/update-day-type", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayType: value }),
    });

    setBusy(false);

    if (res.ok) {
      setMessage("تم تحديث نوع اليوم");
    } else {
      setError("تعذر تغيير نوع اليوم");
    }
  };

  const savePeriods = async () => {
    setBusy(true);
    setMessage(null);
    setError(null);

    const res = await fetch("/api/admin/update-periods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dayType: editDayType,
        periods: editingPeriods.map((p) => ({
          order: p.order,
          name: p.name,
          startTime: p.startTime,
          endTime: p.endTime,
        })),
      }),
    });

    setBusy(false);

    if (res.ok) {
      setMessage("تم حفظ أوقات الحصص");
    } else {
      const payload = await res.json().catch(() => ({}));
      setError(payload?.error || "تعذر حفظ الحصص");
    }
  };

  const updatePeriodField = (
    order: number,
    field: "startTime" | "endTime" | "name",
    value: string,
  ) => {
    setPeriods((prev) => ({
      ...prev,
      [editDayType]: prev[editDayType].map((p) =>
        p.order === order ? { ...p, [field]: value } : p,
      ),
    }));
  };

  const toMinutes = (time: string) => {
    const [h = "0", m = "0"] = time.split(":");
    return Number(h) * 60 + Number(m);
  };

  const toTimeString = (mins: number) => {
    const minutes = Math.max(0, mins);
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const getDuration = (p: Period) =>
    Math.max(0, toMinutes(p.endTime) - toMinutes(p.startTime));

  const updateStartAndDuration = (order: number, startTime: string) => {
    setPeriods((prev) => {
    const list = prev[editDayType].map((p) => {
        if (p.order !== order) return p;
        const duration = getDuration(p);
        const newEnd = toTimeString(toMinutes(startTime) + duration);
        return { ...p, startTime, endTime: newEnd };
      });
      return { ...prev, [editDayType]: list };
    });
  };

  const updateDurationMinutes = (order: number, minutes: number) => {
    setPeriods((prev) => {
    const list = prev[editDayType].map((p) => {
        if (p.order !== order) return p;
        const startMins = toMinutes(p.startTime);
        const newEnd = toTimeString(startMins + Math.max(0, minutes));
        return { ...p, endTime: newEnd };
      });
      return { ...prev, [editDayType]: list };
    });
  };

  const normalizeOrders = (items: Period[]) =>
    items
      .sort((a, b) => a.order - b.order)
      .map((p, idx) => ({ ...p, order: idx + 1 }));

  const addPeriod = () => {
    setPeriods((prev) => {
      const nextOrder = (prev[editDayType].length || 0) + 1;
      const lastEnd =
        prev[editDayType][prev[editDayType].length - 1]?.endTime || "08:00";
      const duration = 45;
      const startTime = lastEnd;
      const endTime = toTimeString(toMinutes(startTime) + duration);

      const updated = [
        ...prev[editDayType],
        {
          id: Date.now(),
          dayType: editDayType,
          order: nextOrder,
          name: `الحصة ${nextOrder}`,
          startTime,
          endTime,
        },
      ];

      return { ...prev, [editDayType]: normalizeOrders(updated) };
    });
  };

  const removePeriod = (order: number) => {
    setPeriods((prev) => {
      const filtered = prev[editDayType].filter((p) => p.order !== order);
      return { ...prev, [editDayType]: normalizeOrders(filtered) };
    });
  };

  const changePassword = async () => {
    setBusy(true);
    setMessage(null);
    setError(null);

    const res = await fetch("/api/admin/update-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        oldPassword: passwords.current,
        newPassword: passwords.next,
      }),
    });

    setBusy(false);

    if (res.ok) {
      setMessage("تم تحديث كلمة المرور");
      setPasswords({ current: "", next: "" });
    } else {
      const payload = await res.json().catch(() => ({}));
      setError(payload?.error || "تعذر تحديث كلمة المرور");
    }
  };

  const logout = async () => {
    setLoggingOut(true);
    await fetch("/api/admin/logout", { method: "POST" });
    setLoggingOut(false);
    setIsAuthed(false);
    setMessage("تم تسجيل الخروج");
  };

  if (!isAuthed) {
    return (
      <div className="max-w-md mx-auto rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <h1 className="text-xl font-bold text-slate-800 mb-2 text-center">
          دخول المدير
        </h1>
        <p className="text-sm text-slate-600 mb-4 text-center">
          هذه الصفحة محمية. أدخل كلمة المرور للمتابعة.
        </p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-slate-700">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-blue-600 text-white py-2 font-semibold hover:bg-blue-700 transition disabled:opacity-60"
          >
            {busy ? "جاري التحقق..." : "تسجيل الدخول"}
          </button>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-2">
              {error}
            </div>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-slate-500">لوحة تحكم المدير</p>
          <h1 className="text-2xl font-bold text-slate-800">إدارة الجدول</h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          اليوم الحالي: {dayTypeLabel(currentDayType)}
          <Link
            href="/"
            className="rounded-full bg-slate-900 text-white px-3 py-1 text-xs font-semibold hover:bg-slate-800 transition"
          >
            العودة للرئيسية
          </Link>
          <button
            onClick={logout}
            disabled={loggingOut}
            className="rounded-full border border-slate-300 text-slate-700 px-3 py-1 text-xs font-semibold hover:bg-slate-100 transition disabled:opacity-60"
          >
            {loggingOut ? "يجري تسجيل الخروج..." : "تسجيل الخروج"}
          </button>
        </div>
      </div>

      {message && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm rounded-lg p-3 shadow-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg p-3 shadow-sm">
          {error}
        </div>
      )}

      <section className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200 p-5 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">بيانات الرأس</h2>
          <button
            onClick={saveHeader}
            disabled={busy}
            className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60"
          >
            حفظ
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm text-slate-600">اسم المدرسة</label>
            <input
              value={header.schoolName}
              onChange={(e) =>
                setHeader((prev) => ({ ...prev, schoolName: e.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="اسم المدرسة"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-slate-600">اسم المدير</label>
            <input
              value={header.managerName}
              onChange={(e) =>
                setHeader((prev) => ({ ...prev, managerName: e.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="اسم المدير"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200 p-5 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">تغيير كلمة المرور</h2>
          <button
            onClick={changePassword}
            disabled={busy}
            className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800 transition disabled:opacity-60"
          >
            حفظ كلمة المرور
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-500">كلمة المرور الحالية</label>
            <input
              type="password"
              value={passwords.current}
              onChange={(e) =>
                setPasswords((prev) => ({ ...prev, current: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">كلمة المرور الجديدة</label>
            <input
              type="password"
              value={passwords.next}
              onChange={(e) =>
                setPasswords((prev) => ({ ...prev, next: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="••••••••"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200 p-5 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">نوع اليوم</h2>
          <div className="flex gap-2">
            {(["ON_SITE", "REMOTE"] as const).map((type) => (
              <button
                key={type}
                onClick={() => saveDayType(type)}
                className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${
                  currentDayType === type
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {dayTypeLabel(type)}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            أوقات الحصص ({dayTypeLabel(editDayType)})
          </h2>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
            <select
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs md:px-3 md:py-2 md:text-sm focus:border-blue-500 focus:outline-none"
              value={editDayType}
              onChange={(e) => setEditDayType(e.target.value as "ON_SITE" | "REMOTE")}
            >
              <option value="ON_SITE">حضوري</option>
              <option value="REMOTE">عن بعد</option>
            </select>
            <button
              type="button"
              onClick={addPeriod}
              className="rounded-lg border border-dashed border-slate-300 text-slate-700 px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm font-semibold hover:border-slate-400 hover:bg-slate-50 transition"
            >
              + إضافة حصة
            </button>
            <button
              onClick={savePeriods}
              disabled={busy}
              className="rounded-lg bg-blue-600 text-white px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60"
            >
              حفظ الأوقات
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {editingPeriods.map((period) => (
            <div
              key={`${editDayType}-${period.order}`}
              className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center border-2 border-slate-300 rounded-xl p-3"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs text-slate-500">مسمى الحصة</label>
                  <button
                    type="button"
                    onClick={() => removePeriod(period.order)}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    حذف
                  </button>
                </div>
                <input
                  type="text"
                  value={period.name || ""}
                  onChange={(e) =>
                    updatePeriodField(period.order, "name", e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder={`الحصة ${period.order}`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">بداية الحصة</label>
                <input
                  type="time"
                  value={period.startTime}
                  onChange={(e) =>
                    updateStartAndDuration(period.order, e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="08:00"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">مدة الحصة (دقيقة)</label>
                <input
                  type="number"
                  min={1}
                  value={getDuration(period)}
                  onChange={(e) => updateDurationMinutes(period.order, Number(e.target.value || 0))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="45"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">نهاية الحصة</label>
                <input
                  type="time"
                  value={period.endTime}
                  onChange={(e) =>
                    updatePeriodField(period.order, "endTime", e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="08:45"
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
