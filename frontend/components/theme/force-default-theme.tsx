"use client";

import { useEffect } from "react";
import { useAppTheme } from "./app-theme-provider";

export function ForceDefaultTheme() {
  const { suppressTheme } = useAppTheme();

  useEffect(() => suppressTheme(), [suppressTheme]);

  return null;
}
