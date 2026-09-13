"use client";

import { useId, useRef, useState } from "react";

const displayDate = (value: string) => value ? value.split("-").reverse().join("/") : "";

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
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState({ source: value, text: displayDate(value) });
  const text = draft.source === value ? draft.text : displayDate(value);
  const invalid = text.length > 0 && !parseDate(text);

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs text-slate-500">{label} (يوم/شهر/سنة)</label>
      <div className="flex items-center gap-2">
        <input
          ref={input}
          id={id}
          type="text"
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
          className="w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:ring-2 focus:ring-slate-200 focus:outline-none"
        />
        <button type="button" aria-label={`اختيار ${label} من التقويم`}
          onClick={() => {
            try {
              if (picker.current?.showPicker) picker.current.showPicker();
              else input.current?.focus();
            } catch { input.current?.focus(); }
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-600">تقويم</button>
        <input ref={picker} type="date" tabIndex={-1} aria-hidden="true" className="sr-only" value={value}
          onChange={(event) => {
            const next = event.target.value;
            setDraft({ source: next, text: displayDate(next) });
            onChange(next);
          }} />
      </div>
      {invalid && <p id={`${id}-error`} className="text-xs text-rose-700">أدخل تاريخًا صحيحًا بصيغة يوم/شهر/سنة، مثل 13/09/2026.</p>}
    </div>
  );
}
