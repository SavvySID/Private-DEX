import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container pt-32 pb-24 text-center">
      <h1 className="text-2xl font-bold mb-2">404</h1>
      <p className="text-muted-foreground mb-6">This page could not be found.</p>
      <Link href="/" className="text-primary font-medium hover:underline">
        Back to swap
      </Link>
    </div>
  );
}
