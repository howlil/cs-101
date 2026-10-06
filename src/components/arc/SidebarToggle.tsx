"use client";

import { useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from './button/button';
import styles from './sidebar-toggle.module.css';

export default function SidebarToggle() {
  const [collapsed, setCollapsed] = useState(false);

  const toggle = () => {
    const next = !collapsed;
    document.documentElement.dataset.sidebarCollapsed = String(next);
    setCollapsed(next);
  };

  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return <Button
    type="button"
    variant="ghost"
    size="md"
    className={styles.toggle}
    aria-label={collapsed ? 'Buka sidebar materi' : 'Tutup sidebar materi'}
    aria-controls="course-sidebar"
    aria-expanded={!collapsed}
    onClick={toggle}
  ><Icon size={18} strokeWidth={1.8} aria-hidden="true" /></Button>;
}
