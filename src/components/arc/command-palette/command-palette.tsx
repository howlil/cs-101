"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, CornerDownLeft, Search } from "lucide-react";
import { Input } from "../input/input";
import styles from "./command-palette.module.css";
import { matchesQuery } from '../lib/matches-query';

export type CommandItem = {
  id: string;
  label: string;
  description?: string;
  group?: string;
  keywords?: string[];
  icon?: ReactNode;
};

export function CommandPalette({
  items,
  placeholder = "Cari…",
  onSelect,
  onClose,
}: {
  items: CommandItem[];
  placeholder?: string;
  onSelect: (item: CommandItem) => void;
  onClose?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("id-ID");
    if (!q) return items.slice(0, 18);
    return items.filter((item) =>
      [item.label, item.description, item.group, ...(item.keywords ?? [])]
        .filter(Boolean)
        .join(" ")
        .trim()
        .length > 0 && matchesQuery([item.label, item.description, item.group, ...(item.keywords ?? [])].filter(Boolean).join(" "), q)
    ).slice(0, 24);
  }, [items, query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const choose = (index: number) => {
    const item = filtered[index];
    if (item) onSelect(item);
  };

  return <div className={styles.root}>
    <div className={styles.searchRow}>
      <Search size={16} strokeWidth={1.8} aria-hidden="true" />
      <div className={styles.field}>
        <Input
          ref={inputRef}
          label="Cari"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls="command-palette-options"
          aria-activedescendant={filtered[activeIndex] ? "command-option-" + filtered[activeIndex].id : undefined}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((current) => filtered.length ? (current + 1) % filtered.length : 0);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((current) => filtered.length ? (current - 1 + filtered.length) % filtered.length : 0);
            } else if (event.key === "Enter") {
              event.preventDefault();
              choose(activeIndex);
            } else if (event.key === "Escape" && query) {
              event.preventDefault();
              event.stopPropagation();
              setQuery("");
            } else if (event.key === "Escape") {
              onClose?.();
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    </div>

    <div id="command-palette-options" className={styles.results} role="listbox" aria-label="Hasil">
      {filtered.length ? filtered.map((item, index) => (
        <button
          key={item.id}
          id={"command-option-" + item.id}
          type="button"
          role="option"
          aria-selected={index === activeIndex}
          className={styles.item}
          data-active={index === activeIndex || undefined}
          onMouseEnter={() => setActiveIndex(index)}
          onClick={() => onSelect(item)}
        >
          <span className={styles.icon} aria-hidden="true">{item.icon}</span>
          <span className={styles.copy}>
            <strong>{item.label}</strong>
            {(item.description || item.group) && <small>{[item.group, item.description].filter(Boolean).join(" / ")}</small>}
          </span>
        </button>
      )) : <p className={styles.empty}>Tidak ada hasil.</p>}
    </div>

    <footer className={styles.footer}>
      <span><ArrowUp size={11} strokeWidth={1.8} aria-hidden="true" /><ArrowDown size={11} strokeWidth={1.8} aria-hidden="true" /> pilih</span>
      <span><CornerDownLeft size={11} strokeWidth={1.8} aria-hidden="true" /> buka</span>
      <span>Esc tutup</span>
    </footer>
  </div>;
}
