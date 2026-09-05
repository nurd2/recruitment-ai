"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 px-6 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <p className="text-sm font-medium text-muted-foreground">Request could not be completed</p>
          <CardTitle>Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 text-sm text-muted-foreground">
          <p>
            The page could not be loaded. Try again, or return to the dashboard. If the problem
            continues, contact an administrator.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={reset}>Try again</Button>
            <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
              Go to dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
