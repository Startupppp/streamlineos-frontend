"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchInput } from "@/components/ui/search-input";
import { useDebouncedValue } from "@/hooks/common/use-debounce";

export function BlogSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("search") ?? "");
  const debouncedValue = useDebouncedValue(value, 350);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const trimmed = debouncedValue.trim();
    router.push(trimmed ? `/blogs?search=${encodeURIComponent(trimmed)}` : "/blogs");
  }, [debouncedValue, router]);

  function handleChange(value: string) {
    setValue(value);
  }

  return (
    <div className="min-w-0 mx-auto w-full max-w-md">
          <SearchInput value={value} onValueChange={handleChange} placeholder="Search articles…" aria-label="Search articles" />
        </div>
  );
}
