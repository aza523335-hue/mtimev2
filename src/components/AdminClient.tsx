"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { dayTypeLabel } from "@/lib/date-utils";

type Period = {
  id: number;
  order: number;
  dayType: string;
  name?: string;
  startTime: string;
  endTime: string;
};

type TermItem = {
  id?: number;
  name: string;
  startDate: string;
  endDate: string;
};

type SettingsShape = {
  schoolName: string;
  managerName: string;
  currentDayType: string;
  autoDayTypeEnabled: boolean;
  onSiteDays: number[];
  remoteDays: number[];
};

type Props = {
  authed: boolean;
  settings: SettingsShape;
  onSitePeriods: Period[];
  remotePeriods: Period[];
  terms: TermItem[];
};

export const AdminClient = ({
  authed,
  settings,
  onSitePeriods,
  remotePeriods,
  terms: initialTerms,
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
  const [autoDayTypeEnabled, setAutoDayTypeEnabled] = useState(
    settings.autoDayTypeEnabled,
  );
  const [autoDays, setAutoDays] = useState<Record<"ON_SITE" | "REMOTE", number[]>>({
    ON_SITE: settings.onSiteDays,
    REMOTE: settings.remoteDays,
  });
  const [editDayType, setEditDayType] = useState<"ON_SITE" | "REMOTE">(
    "ON_SITE",
  );
  const [periods, setPeriods] = useState<Record<string, Period[]>>({
    ON_SITE: onSitePeriods,
    REMOTE: remotePeriods,
  });
  const [terms, setTerms] = useState<TermItem[]>(initialTerms);
  const [passwords, setPasswords] = useState({
    current: "",
    next: "",
  });
  const [loggingOut, setLoggingOut] = useState(false);

  const toDateInput = (value: Date) => value.toISOString().split("T")[0];

  const broadcastUpdate = () => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
      return;
    }
    try {
      const channel = new BroadcastChannel("mtime-updates");
      channel.postMessage({ type: "settings-updated" });
      channel.close();
    } catch {
      // Ignore broadcast failures on unsupported browsers.
    }
  };

  const editingPeriods = useMemo(() => {
    return [...periods[editDayType]].sort((a, b) => a.order - b.order);
  }, [editDayType, periods]);

  const dayOptions = [
    { value: 0, label: "الأحد" },
    { value: 1, label: "الاثنين" },
    { value: 2, label: "الثلاثاء" },
    { value: 3, label: "الأربعاء" },
    { value: 4, label: "الخميس" },
    { value: 5, label: "الجمعة" },
    { value: 6, label: "السبت" },
  ];

  const addTerm = () => {
    setTerms((prev) => {
      const lastEndRaw = prev[prev.length - 1]?.endDate;
      const lastEndDate = lastEndRaw ? new Date(lastEndRaw) : null;
      const safeLastEnd =
        lastEndDate && !Number.isNaN(lastEndDate.getTime())
          ? lastEndDate
          : null;
      const start = safeLastEnd ? toDateInput(safeLastEnd) : toDateInput(new Date());
      const end = toDateInput(
        new Date(
          (safeLastEnd ?? new Date()).getTime() + 90 * 24 * 60 * 60 * 1000,
        ),
      );
      setMessage("تم إضافة ترم جديد، لا تنسَ الحفظ لتأكيد الإضافة.");
      setError(null);
      setToastVisible(true);
      return [
        ...prev,
        {
          name: `ترم ${prev.length + 1}`,
          startDate: start,
          endDate: end,
        },
      ];
    });
  };

  const updateTermField = (
    index: number,
    field: keyof TermItem,
    value: string,
  ) => {
    setTerms((prev) =>
      prev.map((term, idx) =>
        idx === index ? { ...term, [field]: value } : term,
      ),
    );
  };

  const removeTerm = (index: number) => {
    setTerms((prev) => prev.filter((_, idx) => idx !== index));
    setMessage("تم حذف الترم، احفظ التغييرات لتأكيد الحذف.");
    setError(null);
    setToastVisible(true);
  };

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
      broadcastUpdate();
    } else {
      setError("تعذر تغيير نوع اليوم");
    }
  };

  const saveAutoDayType = async () => {
    setBusy(true);
    setMessage(null);
    setError(null);

    const res = await fetch("/api/admin/update-auto-day-type", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        autoDayTypeEnabled,
        onSiteDays: autoDays.ON_SITE,
        remoteDays: autoDays.REMOTE,
      }),
    });

    setBusy(false);

    if (res.ok) {
      const payload = await res.json().catch(() => ({}));
      const appliedType =
        payload?.appliedDayType ||
        payload?.settings?.currentDayType ||
        currentDayType;
      setCurrentDayType(appliedType);
      setMessage("تم حفظ التبديل التلقائي");
      broadcastUpdate();
    } else {
      const payload = await res.json().catch(() => ({}));
      setError(payload?.error || "تعذر حفظ التبديل التلقائي");
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

  const saveTerms = async () => {
    setBusy(true);
    setMessage(null);
    setError(null);

    const res = await fetch("/api/admin/terms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ terms }),
    });

    setBusy(false);

    if (res.ok) {
      const payload = await res.json().catch(() => ({}));
      setTerms(Array.isArray(payload?.terms) ? payload.terms : terms);
      setMessage("تم حفظ أترام السنة الدراسية");
      broadcastUpdate();
    } else {
      const payload = await res.json().catch(() => ({}));
      setError(payload?.error || "تعذر حفظ الأترام");
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
    setMessage("تم إضافة حصة جديدة، احفظ التغييرات للتأكيد.");
    setError(null);
    setToastVisible(true);
  };

  const removePeriod = (order: number) => {
    setPeriods((prev) => {
      const filtered = prev[editDayType].filter((p) => p.order !== order);
      return { ...prev, [editDayType]: normalizeOrders(filtered) };
    });
    setMessage("تم حذف الحصة، احفظ التغييرات للتأكيد.");
    setError(null);
    setToastVisible(true);
  };

  const toggleDaySelection = (type: "ON_SITE" | "REMOTE", day: number) => {
    setAutoDays((prev) => {
      const exists = prev[type].includes(day);
      const nextList = exists
        ? prev[type].filter((d) => d !== day)
        : [...prev[type], day];
      return {
        ...prev,
        [type]: nextList.sort((a, b) => a - b),
      };
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

  const panelClass =
    "rounded-2xl border border-slate-200 bg-white/80 backdrop-blur shadow-sm";
  const titleAccent =
    "inline-block h-3 w-3 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 shadow-sm";
  const titleChip =
    "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold text-white bg-gradient-to-r from-slate-900 via-indigo-700 to-violet-700 shadow-sm";
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!toastVisible) return;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    const timer = setTimeout(() => {
      setToastVisible(false);
    }, 2000);
    toastTimerRef.current = timer;
    return () => clearTimeout(timer);
  }, [toastVisible]);

  const showToast = Boolean(toastVisible && (message || error));

  if (!isAuthed) {
    return (
      <div className="max-w-md mx-auto">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.35),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.2),transparent_35%)]" />
          <div className="relative space-y-6">
            <div className="space-y-1 text-center">
              <p className="text-sm text-white/70">لوحة المدير</p>
              <h1 className="text-2xl font-bold">دخول آمن</h1>
              <p className="text-xs text-white/60">
                أدخل كلمة المرور للمتابعة إلى إدارة الجدول.
              </p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-white/80">كلمة المرور</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/50 focus:border-white focus:outline-none focus:ring-1 focus:ring-white"
                  placeholder="••••••••"
                />
              </div>
              <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white py-2 font-semibold shadow-sm hover:opacity-95 transition disabled:opacity-60"
            >
              {busy ? "جاري التحقق..." : "تسجيل الدخول"}
            </button>
              {error && (
                <div className="text-sm text-red-100 bg-red-500/30 border border-red-200/40 rounded-lg p-2">
                  {error}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showToast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
          <div
            className={`pointer-events-auto rounded-2xl border px-5 py-4 shadow-2xl backdrop-blur max-w-sm w-full text-center ${
              error
                ? "bg-white/95 border-red-200 text-red-700"
                : "bg-white/95 border-emerald-200 text-emerald-700"
            }`}
          >
            <p className="text-sm font-semibold leading-relaxed">
              {error || message}
            </p>
          </div>
        </div>
      )}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-l from-indigo-700 via-violet-700 to-purple-700 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_10%_10%,rgba(255,255,255,0.3),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.2),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-sm text-white/70">لوحة تحكم المدير</p>
            <h1 className="text-2xl sm:text-3xl font-bold">إدارة الجدول</h1>
            <p className="text-xs sm:text-sm text-white/60">
              تحكم سريع في بيانات المدرسة والأيام وأوقات الحصص.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-semibold">
            <span className="rounded-full bg-white/15 border border-white/20 px-4 py-2 text-white">
              اليوم الحالي: {dayTypeLabel(currentDayType)}
            </span>
            <Link
              href="/"
              className="rounded-full bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white px-4 py-2 shadow-sm hover:opacity-95 transition"
            >
              العودة للرئيسية
            </Link>
            <div className="w-full flex justify-center md:w-auto md:justify-start">
              <button
                onClick={logout}
                disabled={loggingOut}
                className="rounded-full border border-white/40 text-white px-4 py-2 hover:bg-white/15 transition disabled:opacity-60"
              >
                {loggingOut ? "يجري تسجيل الخروج..." : "تسجيل الخروج"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm rounded-xl p-3 shadow-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl p-3 shadow-sm">
          {error}
        </div>
      )}

      <section className={`${panelClass} p-5 space-y-4`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={titleAccent} />
              <h2 className="text-lg font-semibold text-slate-900">
                <span className={titleChip}>بيانات المدرسة</span>
              </h2>
            </div>
            <p className="text-xs text-slate-500">تظهر في رأس الصفحة الرئيسية</p>
          </div>
          <button
            onClick={saveHeader}
            disabled={busy}
            className="rounded-lg bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:opacity-95 transition disabled:opacity-60"
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
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:ring-2 focus:ring-slate-200 focus:outline-none"
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
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:ring-2 focus:ring-slate-200 focus:outline-none"
              placeholder="اسم المدير"
            />
          </div>
        </div>
      </section>

      <section className={`${panelClass} p-5 space-y-4`}>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className={titleAccent} />
            <h2 className="text-lg font-semibold text-slate-900">
              <span className={titleChip}>تغيير كلمة المرور</span>
            </h2>
          </div>
          <p className="text-xs text-slate-500">استخدم كلمة قوية سهلة التذكر</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-500">الحالية</label>
            <input
              type="password"
              value={passwords.current}
              onChange={(e) =>
                setPasswords((prev) => ({ ...prev, current: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:ring-2 focus:ring-slate-200 focus:outline-none"
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">الجديدة</label>
            <input
              type="password"
              value={passwords.next}
              onChange={(e) =>
                setPasswords((prev) => ({ ...prev, next: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:ring-2 focus:ring-slate-200 focus:outline-none"
              placeholder="••••••••"
            />
          </div>
        </div>
        <button
          onClick={changePassword}
          disabled={busy}
          className="w-full sm:w-auto rounded-lg bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:opacity-95 transition disabled:opacity-60"
        >
          حفظ كلمة المرور
        </button>
      </section>

      <section className={`${panelClass} p-5 space-y-4`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={titleAccent} />
              <h2 className="text-lg font-semibold text-slate-900">
                <span className={titleChip}>أترام السنة الدراسية</span>
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              حدد اسم كل ترم مع تاريخ البداية والنهاية ليظهر المتبقي في الصفحة الرئيسية.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addTerm}
              className="rounded-lg border border-dashed border-slate-300 text-slate-700 px-3 py-1.5 text-xs sm:text-sm font-semibold hover:border-slate-400 hover:bg-slate-50 transition"
            >
              + إضافة ترم
            </button>
            <button
              onClick={saveTerms}
              disabled={busy}
              className="rounded-lg bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white px-3 py-1.5 text-xs sm:text-sm font-semibold shadow-sm hover:opacity-95 transition disabled:opacity-60"
            >
              حفظ الأترام
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {terms.map((term, index) => {
            const darkRow = index % 2 === 0;
            return (
              <div
                key={`${term.id ?? "new"}-${index}`}
                className={`rounded-xl border p-4 shadow-sm space-y-3 ${
                  darkRow ? "bg-slate-50 border-slate-200" : "bg-white/80 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      الترم {index + 1}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {term.name || "لم يحدد الاسم بعد"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTerm(index)}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    حذف
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">اسم الترم</label>
                    <input
                      type="text"
                      value={term.name}
                      onChange={(e) =>
                        updateTermField(index, "name", e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:ring-2 focus:ring-slate-200 focus:outline-none"
                      placeholder="مثال: الترم الأول"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">بداية الترم</label>
                    <input
                      type="date"
                      value={term.startDate}
                      onChange={(e) =>
                        updateTermField(index, "startDate", e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:ring-2 focus:ring-slate-200 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">نهاية الترم</label>
                    <input
                      type="date"
                      value={term.endDate}
                      onChange={(e) =>
                        updateTermField(index, "endDate", e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:ring-2 focus:ring-slate-200 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {!terms.length && (
            <div className="text-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-xl py-6">
              لم تتم إضافة أترام بعد.
            </div>
          )}
        </div>
      </section>

      <section className={`${panelClass} p-5 space-y-4`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={titleAccent} />
              <h2 className="text-lg font-semibold text-slate-900">
                <span className={titleChip}>نوع اليوم</span>
              </h2>
            </div>
            <p className="text-xs text-slate-500">تحويل فوري بين حضوري وعن بعد</p>
          </div>
          <span className="text-xs text-slate-500">الوضع الحالي: {dayTypeLabel(currentDayType)}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(["ON_SITE", "REMOTE"] as const).map((type) => (
            <button
              key={type}
              onClick={() => saveDayType(type)}
              className={`rounded-xl px-4 py-3 text-sm font-semibold border transition text-center ${
                currentDayType === type
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-transparent shadow-sm"
                  : "bg-white text-slate-800 border-slate-200 hover:border-indigo-200 hover:text-indigo-700"
              }`}
            >
              {dayTypeLabel(type)}
            </button>
          ))}
        </div>
      </section>

      <section className={`${panelClass} p-5 space-y-4`}>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={titleAccent} />
              <h2 className="text-lg font-semibold text-slate-900">
                <span className={titleChip}>التبديل التلقائي حسب الأيام</span>
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              اختر أيام كل نوع وسيتم تغيير نوع اليوم تلقائياً.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-700">التبديل التلقائي</span>
            <button
              type="button"
              onClick={() => setAutoDayTypeEnabled((prev) => !prev)}
              className={`relative inline-flex h-8 w-16 items-center rounded-full border overflow-hidden transition ${
                autoDayTypeEnabled
                  ? "bg-emerald-500 border-emerald-500"
                  : "bg-slate-200 border-slate-300"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow ring-1 ring-black/5 transition-all duration-200 ease-out ${
                  autoDayTypeEnabled
                    ? "left-auto right-1"
                    : "left-1 right-auto"
                }`}
              />
              <span className="sr-only">تفعيل التبديل التلقائي</span>
            </button>
            <button
              onClick={saveAutoDayType}
              disabled={busy}
              className="rounded-lg bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white px-3 py-2 text-sm font-semibold shadow-sm hover:opacity-95 transition disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              حفظ التبديل التلقائي
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(["ON_SITE", "REMOTE"] as const).map((type) => (
            <div
              key={type}
              className="rounded-xl border border-slate-200 bg-white/80 p-4 space-y-3 shadow-inner"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">
                  أيام {dayTypeLabel(type)}
                </p>
                <span className="text-[11px] text-slate-500">
                  {autoDays[type].length} يوم/أيام
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {dayOptions.map((day) => {
                  const active = autoDays[type].includes(day.value);
                  return (
                    <button
                      type="button"
                      key={`${type}-${day.value}`}
                      onClick={() => toggleDaySelection(type, day.value)}
                      disabled={!autoDayTypeEnabled}
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${
                        active
                          ? "bg-emerald-500 text-white border-emerald-500 shadow-sm hover:bg-emerald-600"
                          : "bg-white text-slate-700 border-slate-200 hover:border-emerald-200 hover:text-emerald-700 disabled:border-slate-200 disabled:text-slate-400"
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          في حال التعارض بين النوعين لنفس اليوم سيُحتفظ بآخر اختيار يدوي.
        </p>
      </section>

      <section className={`${panelClass} p-5 space-y-4`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={titleAccent} />
              <h2 className="text-lg font-semibold text-slate-900">
                <span className={titleChip}>أوقات الحصص ({dayTypeLabel(editDayType)})</span>
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              عدّل الترتيب والأوقات ثم احفظ التغييرات
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
            <select
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs md:px-3 md:py-2 md:text-sm focus:border-slate-900 focus:ring-2 focus:ring-slate-200 focus:outline-none"
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
              className="rounded-lg bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm font-semibold shadow-sm hover:opacity-95 transition disabled:opacity-60"
            >
              حفظ الأوقات
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {editingPeriods.map((period, index) => {
            const darkRow = index % 2 === 0;
            return (
            <div
              key={`${editDayType}-${period.order}`}
              className={`rounded-xl border-2 border-slate-300 p-3 md:p-4 shadow-md space-y-3 ${
                darkRow ? "bg-slate-100" : "bg-white/70"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">
                    الحصة {period.order}
                  </span>
                  <span className="text-[11px] text-slate-400">{dayTypeLabel(editDayType)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removePeriod(period.order)}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  حذف
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">مسمى الحصة</label>
                  <input
                    type="text"
                    value={period.name || ""}
                    onChange={(e) =>
                      updatePeriodField(period.order, "name", e.target.value)
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:ring-2 focus:ring-slate-200 focus:outline-none"
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
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:ring-2 focus:ring-slate-200 focus:outline-none"
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
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:ring-2 focus:ring-slate-200 focus:outline-none"
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
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:ring-2 focus:ring-slate-200 focus:outline-none"
                    placeholder="08:45"
                  />
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
