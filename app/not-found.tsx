import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-4 py-12">
      <Card className="w-full border-blue-100 shadow-sm">
        <CardHeader>
          <CardTitle>Page introuvable</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Cette page raceSail n&apos;existe pas ou le lien a change.
          </p>
          <Button asChild>
            <Link href="/">Retour au tableau de bord</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
