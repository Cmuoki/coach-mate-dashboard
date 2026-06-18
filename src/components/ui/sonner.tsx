"use client";
import { Toaster as Sonner } from "sonner";
export const Toaster = (props: React.ComponentProps<typeof Sonner>) => (
  <Sonner richColors position="top-right" {...props} />
);
