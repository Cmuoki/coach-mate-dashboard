"use client";
import { useEffect, useState } from "react";
import { Toaster as Sonner } from "sonner";

export const Toaster = (props: React.ComponentProps<typeof Sonner>) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <Sonner richColors position="top-right" {...props} />;
};

export { toast } from "sonner";
