import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 px-6 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <p className="text-sm font-medium text-muted-foreground">Error 404</p>
          <CardTitle>Page or record not found</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 text-sm text-muted-foreground">
          <p>The requested page or recruitment record may have been removed or the link may be incorrect.</p>
          <Button nativeButton={false} render={<Link href="/" />}>Go to dashboard</Button>
        </CardContent>
      </Card>
    </main>
  );
}
