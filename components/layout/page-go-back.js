"use client";

import { usePathname, useRouter } from "next/navigation";
import Button from "@/components/ui/button";

const TOP_LEVEL_PATHS = new Set([
  "/dashboard",
  "/tasks",
  "/thoughts",
  "/plans",
  "/planning",
  "/financial-records",
  "/categories",
]);

export function parentPathFromPathname(pathname) {
  if (!pathname || TOP_LEVEL_PATHS.has(pathname)) {
    return null;
  }
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) {
    return null;
  }
  return `/${segments.slice(0, -1).join("/")}`;
}

export default function PageGoBack() {
  const pathname = usePathname();
  const router = useRouter();
  const href = parentPathFromPathname(pathname);

  if (!href) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="secondary"
      className="mb-1 w-fit shrink-0"
      onClick={() => router.push(href)}
    >
      Go back
    </Button>
  );
}
