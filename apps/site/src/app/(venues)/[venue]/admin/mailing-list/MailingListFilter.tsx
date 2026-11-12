"use client";

import { useState } from "react";

// Filters the mailing list table as you type (name, email, phone, source).
export default function MailingListFilter({ tableId, total }: { tableId: string; total: number }) {
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(total);
  const filter = (value: string) => {
    setQ(value);
    const needle = value.trim().toLowerCase();
    let n = 0;
    document.querySelectorAll<HTMLTableRowElement>(`#${tableId} tbody tr`).forEach((row) => {
      const hit = !needle || row.textContent?.toLowerCase().includes(needle);
      row.hidden = !hit;
      if (hit) n += 1;
    });
    setShown(n);
  };
  return (
    <label className="admin-list-search">
      <span>Search</span>
      <input type="search" value={q} onChange={(e) => filter(e.target.value)} placeholder="Name, email or phone" />
      {q ? (
        <em>
          {shown} of {total}
        </em>
      ) : null}
    </label>
  );
}
