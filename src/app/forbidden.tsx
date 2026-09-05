import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForbiddenPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 px-6 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <p className="text-sm font-medium text-muted-foreground">Access denied</p>
          <CardTitle>You do not have permission to view this page</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 text-sm text-muted-foreground">
          <p>
            This page is available only to administrators. You can still view candidates, job
            titles, and pipeline information available to your account.
          </p>
          <Button nativeButton={false} render={<Link href="/" />}>Go to dashboard</Button>
        </CardContent>
      </Card>
    </main>
  );
}
