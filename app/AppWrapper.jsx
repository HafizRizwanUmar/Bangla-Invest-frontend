'use client';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const LegacyApp = dynamic(() => import('../src/App'), { ssr: false });

export default function AppWrapper() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return <LegacyApp />;
}
