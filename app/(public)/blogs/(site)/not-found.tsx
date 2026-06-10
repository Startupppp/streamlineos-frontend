import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function BlogNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-32 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Article not found</h1>
      <p className="mt-3 text-muted-foreground">
        The article you’re looking for doesn’t exist or may have been moved.
      </p>
      <Button asChild className="mt-6">
        <Link href="/blogs">Back to Blog</Link>
      </Button>
    </div>
  );
}
