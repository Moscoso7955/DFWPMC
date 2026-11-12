"use client";

import { useRef, useState } from "react";
import { hostOf, money, parseMoney, type Item, type Play } from "@/lib/playbookShared";
import { dollars, uploadPlayPhoto } from "../playbookClient";
import { InlineArea, InlineInput } from "./Inline";
import type { PlayApi } from "./usePlay";

function ItemRow({ play, item, p, storageReady }: { play: Play; item: Item; p: PlayApi; storageReady: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const save = (body: Record<string, unknown>) => p.update("items", item.id, body);

  return (
    <li className={item.needsReorder ? "is-flag" : undefined}>
      <button type="button" className="pb-item-photo" onClick={() => storageReady && fileRef.current?.click()} aria-label="Add or change photo">
        {item.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.photo.thumb} alt="" />
        ) : (
          <span>{uploading ? "…" : "📷"}</span>
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setUploading(true);
          const key = await p.run(() => uploadPlayPhoto(play.id, file));
          if (key) await save({ photoKey: key });
          setUploading(false);
        }}
      />
      <div className="pb-item-main">
        <InlineInput className="pb-item-name" value={item.name} aria-label="Item" onSave={(v) => save({ name: v })} />
        <InlineArea value={item.notes} rows={2} placeholder="Notes: where it goes, what broke, how many we use…" aria-label="Notes" onSave={(v) => save({ notes: v })} />
      </div>
      <dl>
        <div>
          <dt>Have</dt>
          <dd>
            <InlineInput value={item.qty} placeholder="—" aria-label="How many" onSave={(v) => save({ qty: v })} />
          </dd>
        </div>
        <div>
          <dt>Stored</dt>
          <dd>
            <InlineInput value={item.stored} placeholder="—" aria-label="Where it's stored" onSave={(v) => save({ stored: v })} />
          </dd>
        </div>
        <div>
          <dt>Cost</dt>
          <dd className="pb-cost">
            <InlineInput value={dollars(item.costCents)} placeholder="$" inputMode="decimal" aria-label="Cost" onSave={(v) => save({ costCents: parseMoney(v) })} />
            <InlineInput value={item.costUnit} placeholder="each" aria-label="Per" onSave={(v) => save({ costUnit: v })} />
          </dd>
        </div>
      </dl>
      <div className="pb-item-buy">
        <InlineInput value={item.url} placeholder="Link to buy" aria-label="Link to buy" onSave={(v) => save({ url: v })} />
        {item.url ? (
          <a className="pb-buy" href={item.url} target="_blank" rel="noreferrer">
            Buy at {hostOf(item.url)} ↗
          </a>
        ) : null}
        <label className="pb-reorder-toggle">
          <input type="checkbox" defaultChecked={item.needsReorder} onChange={(e) => save({ needsReorder: e.target.checked })} /> Needs reorder
        </label>
        <button type="button" className="is-quiet" onClick={() => window.confirm(`Remove “${item.name}”?`) && p.remove("items", item.id)}>
          Remove
        </button>
      </div>
    </li>
  );
}

export default function SuppliesTab({ play, p, storageReady }: { play: Play; p: PlayApi; storageReady: boolean }) {
  const [name, setName] = useState("");
  const reorder = play.items.filter((i) => i.needsReorder);
  const value = play.items.reduce((n, i) => n + (i.costCents ?? 0), 0);
  return (
    <div className="pb-decor">
      <p className="admin-mailing-list-note">
        Everything we bought for this, where it lives, and where to get more. Flag anything broken or running low and it
        shows up on the countdown{reorder.length ? ` (${reorder.length} to reorder now)` : ""}.
        {value ? ` Listed costs add up to ${money(value)}.` : ""}
      </p>
      {!storageReady ? <p className="admin-photos-warning">Photo storage isn&apos;t connected, so item photos are off.</p> : null}
      <ul>
        {play.items.map((item) => (
          <ItemRow key={item.id} play={play} item={item} p={p} storageReady={storageReady} />
        ))}
      </ul>
      <form
        className="pb-inline-add"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          if (await p.add("items", { name, sort: play.items.length })) setName("");
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add an item, e.g. Warm white LED string, 66 ft" />
        <button type="submit" disabled={p.busy}>
          + Add item
        </button>
      </form>
    </div>
  );
}
