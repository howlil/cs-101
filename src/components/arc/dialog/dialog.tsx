"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "../button/button";
import styles from "./dialog.module.css";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export interface DialogContentProps extends Omit<ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, "children" | "title"> {
  title: string;
  description?: string;
  children: ReactNode;
}

export function DialogContent({
  title,
  description,
  children,
  className,
  ...props
}: DialogContentProps) {
  return <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className={styles.overlay} />
    <DialogPrimitive.Content
      {...props}
      className={[styles.content, className].filter(Boolean).join(" ")}
    >
      <header className={styles.header}>
        <div className={styles.heading}>
          <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
          {description ? <DialogPrimitive.Description>{description}</DialogPrimitive.Description> : null}
        </div>
        <DialogPrimitive.Close asChild>
          <Button type="button" variant="ghost" size="sm" className={styles.close} aria-label="Tutup dialog">
            <X size={15} strokeWidth={1.8} aria-hidden="true" />
          </Button>
        </DialogPrimitive.Close>
      </header>
      <div className={styles.body}>{children}</div>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>;
}
