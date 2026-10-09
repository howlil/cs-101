import { navigate } from 'astro:transitions/client';
"use client";

import { BookOpen, Boxes, FolderKanban, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CurriculumSearchEntry } from "../../domain/curriculum-v2/selectors";
import { Button } from "../arc/button/button";
import { CommandPalette, type CommandItem } from "../arc/command-palette/command-palette";
import { Dialog, DialogContent, DialogTrigger } from "../arc/dialog/dialog";
import styles from "./curriculum-search.module.css";

type SearchEntry = CurriculumSearchEntry & { href: string };

export default function CurriculumSearch({ entries }: { entries: SearchEntry[] }) {
  const [open, setOpen] = useState(false);

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

  const items = useMemo<CommandItem[]>(() => entries.map((entry) => ({
    id: entry.itemId,
    label: entry.itemId + " · " + entry.title,
    description: entry.moduleTitle,
    group: entry.trackTitle || "Lintas jalur",
    keywords: [entry.searchText],
    icon: entry.kind === "checkpoint"
      ? <FolderKanban size={14} strokeWidth={1.8} />
      : entry.kind === "integration"
        ? <Boxes size={14} strokeWidth={1.8} />
        : <BookOpen size={14} strokeWidth={1.8} />,
  })), [entries]);

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={styles.trigger}
        aria-label="Cari kurikulum"
        title="Cari kurikulum (Ctrl/⌘ K)"
      >
        <Search size={15} strokeWidth={1.8} aria-hidden="true" />
      </Button>
    </DialogTrigger>
    <DialogContent title="Cari kurikulum" className={styles.dialog}>
      <CommandPalette
        items={items}
        placeholder="Cari ID, topik, track, module…"
        onClose={() => setOpen(false)}
        onSelect={(item) => {
          const target = entries.find((entry) => entry.itemId === item.id);
          if (!target) return;
          setOpen(false);
          navigate(target.href);
        }}
      />
    </DialogContent>
  </Dialog>;
}
