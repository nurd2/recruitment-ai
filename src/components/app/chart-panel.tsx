import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ChartPanel({
  title,
  description,
  emptyMessage,
  isEmpty,
  children,
}: {
  title: string;
  description: string;
  emptyMessage: string;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <p className="flex h-70 items-center justify-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
