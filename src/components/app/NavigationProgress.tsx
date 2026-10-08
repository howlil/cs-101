"use client";

import { useEffect, useState } from 'react';

// ClientRouter keeps the current page visible while waiting for SSR. A thin,
// delayed progress line acknowledges a slow navigation without flashing on
// fast ones. Persist this island so listeners are attached only once.
export default function NavigationProgress() {
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const begin = () => setPending(true);
    const finish = () => setPending(false);

    document.addEventListener('astro:before-preparation', begin);
    document.addEventListener('astro:after-preparation', finish);
    document.addEventListener('astro:after-swap', finish);
    document.addEventListener('astro:page-load', finish);

    return () => {
      document.removeEventListener('astro:before-preparation', begin);
      document.removeEventListener('astro:after-preparation', finish);
      document.removeEventListener('astro:after-swap', finish);
      document.removeEventListener('astro:page-load', finish);
    };
  }, []);

  return <div className="navigation-progress" data-pending={pending} aria-hidden="true" />;
}
