"use client";

import { useId, useRef, useState } from "react";

import { formatISODate as displayDate } from "@/lib/date-format";

const parseDate = (value: string) => {
  const normalized = value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(normalized);
  if (!match) return "";
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number(match[3]) > 0 && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : "";
};

export function DayFirstDateInput({ value, onChange, label }: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const id = useId();
  const picker = useRef<HTMLInputElement>(null);
  const [showNativePicker, setShowNativePicker] = useState(false);
  const [draft, setDraft] = useState({ source: value, text: displayDate(value) });
  const text = draft.source === value ? draft.text : displayDate(value);
  const invalid = text.length > 0 && !parseDate(text);

  const openPicker = () => {
    try {
      if (picker.current?.showPicker) {
        picker.current.showPicker();
        return;
      }
    } catch {
      // Keep a visible native date control available when showPicker is blocked.
    }
    setShowNativePicker(true);
  };

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs text-slate-500">{label}</label>
      <div className="relative">
        <input
          id={id}
          type="text"
          onClick={openPicker}
          dir="ltr"
          placeholder="DD/MM/YYYY"
          maxLength={10}
          value={text}
          aria-invalid={Boolean(invalid)}
          aria-describedby={invalid ? `${id}-error` : undefined}
          onChange={(event) => {
            const next = parseDate(event.target.value);
            setDraft({ source: next, text: event.target.value });
            onChange(next);
          }}
          className="w-full min-w-0 rounded-lg border border-slate-200 pl-3 pr-12 py-2 text-sm focus:border-slate-900 focus:ring-2 focus:ring-slate-200 focus:outline-none"
        />
        <button
          type="button"
          aria-label={`اختيار ${label} من التقويم`}
          title="اختيار التاريخ"
          onClick={openPicker}
          className="absolute right-1 top-1 rounded-md p-1.5 text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-600"
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2" />
          </svg>
        </button>
      </div>
      <input
        ref={picker}
        type="date"
        aria-label={`اختيار ${label} من التقويم`}
        tabIndex={showNativePicker ? 0 : -1}
        aria-hidden={!showNativePicker}
        className={showNativePicker ? "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" : "sr-only"}
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          setDraft({ source: next, text: displayDate(next) });
          onChange(next);
          setShowNativePicker(false);
        }}
      />
      {invalid && <p id={`${id}-error`} className="text-xs text-rose-700">أدخل تاريخًا صحيحًا بصيغة يوم/شهر/سنة، مثل 13/09/2026.</p>}
    </div>
  );
}
