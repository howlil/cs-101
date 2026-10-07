"use client";

import { cloneElement, isValidElement, useId, type ReactElement } from "react";
import styles from "./tooltip.module.css";

type TooltipChild = ReactElement<{ "aria-describedby"?: string }>;

export function Tooltip({
  content,
  children,
  side = "right",
}: {
  content: string;
  children: TooltipChild;
  side?: "top" | "right" | "bottom" | "left";
}) {
  const id = useId();

  if (!isValidElement(children)) return children;

  const describedBy = [children.props["aria-describedby"], id].filter(Boolean).join(" ") || undefined;
  const trigger = cloneElement(children, { "aria-describedby": describedBy });

  return <span className={styles.root} data-side={side}>
    {trigger}
    <span id={id} role="tooltip" className={styles.tooltip}>{content}</span>
  </span>;
}
