"use client";

import { HeroUIProvider as HeroUIProviderComponent } from "@heroui/system";
import type * as React from "react";

export default function HeroUIProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <HeroUIProviderComponent>{children}</HeroUIProviderComponent>;
}
