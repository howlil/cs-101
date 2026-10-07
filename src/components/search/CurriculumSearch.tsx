"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { BookOpen, Boxes, FolderKanban, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  searchCurriculum,
  type CurriculumSearchEntry,
} from "../../domain/curriculum-v2/selectors";
import { Button } from "../arc/button/button";
import { Input } from "../arc/input/input";
import { navigate } from "astro:transitions/client";
import styles from "./curriculum-search.module.css";

type SearchEntry = CurriculumSearchEntry & { href: string };

export default function CurriculumSearch({ entries }: { entries: SearchEntry[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(
    () => searchCurriculum(entries, query, 10),
    [entries, query],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const select = (index: number) => {
    const target = results[index] as SearchEntry | undefined;
    if (target) {
      setOpen(false);
      navigate(target.href);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setQuery("");
          setActiveIndex(0);
        }
      }}
    >
      <Dialog.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={styles.trigger}
          aria-label="Cari curriculum"
          title="Cari curriculum (Ctrl/⌘ K)"
        >
          <Search size={15} strokeWidth={1.8} aria-hidden="true" />
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.dialog}
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
        >
          <Dialog.Title className="sr-only">Cari curriculum</Dialog.Title>

          <div className={styles.inputRow}>
            <Search size={17} strokeWidth={1.8} aria-hidden="true" />
            <div className={styles.commandField}>
              <Input
                ref={inputRef}
                label="Cari curriculum"
                className={styles.commandInput}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={open}
                aria-controls="curriculum-search-options"
                aria-activedescendant={
                  results[activeIndex]
                    ? "curriculum-search-option-" + results[activeIndex].itemId
                    : undefined
                }
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setActiveIndex((current) =>
                      results.length ? (current + 1) % results.length : 0,
                    );
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setActiveIndex((current) =>
                      results.length ? (current - 1 + results.length) % results.length : 0,
                    );
                  } else if (event.key === "Enter") {
                    event.preventDefault();
                    select(activeIndex);
                  }
                }}
                placeholder="Cari ID, topik, track, module…"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={styles.close}
                aria-label="Tutup pencarian"
              >
                <X size={16} strokeWidth={1.8} aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>

          <div
            id="curriculum-search-options"
            className={styles.results}
            role="listbox"
            aria-label="Hasil pencarian"
          >
            {!query.trim() ? (
              <p className={styles.hint}>Ketik ID, judul, scope, track, atau module.</p>
            ) : results.length ? (
              results.map((entry, index) => {
                const item = entry as SearchEntry;
                return (
                  <a
                    key={item.itemId}
                    id={"curriculum-search-option-" + item.itemId}
                    href={item.href}
                    role="option"
                    aria-selected={index === activeIndex}
                    className={styles.result}
                    data-active={index === activeIndex || undefined}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <span className={styles.marker} aria-hidden="true">
                      {item.kind === "checkpoint"
                        ? <FolderKanban size={14} strokeWidth={1.8} />
                        : item.kind === "integration"
                          ? <Boxes size={14} strokeWidth={1.8} />
                          : <BookOpen size={14} strokeWidth={1.8} />}
                    </span>
                    <span className={styles.copy}>
                      <span>
                        <code>{item.itemId}</code>
                        <strong>{item.title}</strong>
                      </span>
                      <small>
                        {[item.trackTitle, item.moduleTitle].filter(Boolean).join(" / ") ||
                          "Cross-track"}
                      </small>
                    </span>
                  </a>
                );
              })
            ) : (
              <p className={styles.hint}>Tidak ada item yang cocok.</p>
            )}
          </div>

          <div className={styles.footer}>
            <span>↑↓ pilih</span>
            <span>Enter buka</span>
            <span>Esc tutup</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
