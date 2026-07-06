import { Card, CardContent } from "@/components/ui/card";

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
      </CardContent>
    </Card>
  );
}
