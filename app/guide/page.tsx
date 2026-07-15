import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const sections = [
  {
    title: "1. Creer une regate",
    items: [
      "Depuis le dashboard, cliquer Create Competition.",
      "Choisir le nombre de manches. RaceSail accepte plus de 10 manches.",
      "A partir de 10 manches, les 2 plus mauvaises manches sont retirees du net.",
    ],
  },
  {
    title: "2. Ajouter les athletes",
    items: [
      "Ouvrir Athletes puis ajouter nom, age, sexe, nationalite, club et numero de voile.",
      "Les drapeaux et categories sont calcules automatiquement.",
      "Le numero de voile peut contenir un prefixe pays comme MAR 105.",
    ],
  },
  {
    title: "3. Utiliser Live Race Digital",
    items: [
      "Ouvrir la competition puis cliquer Live.",
      "Cliquer Open Race pour activer la manche.",
      "Entrer seulement le numero de voile, par exemple 105. RaceSail trouve MAR 105.",
      "Cliquer Finish. Le premier bateau devient 1, le suivant 2, puis 3.",
      "Cliquer UFD ou Add penalty pour appliquer une penalite sans position d'arrivee.",
      "Cliquer Finish Race pour mettre automatiquement DNC aux absents.",
    ],
  },
  {
    title: "4. Corriger apres la manche",
    items: [
      "Cliquer Reopen pour corriger une manche terminee.",
      "Dans Results, utiliser Move up / Move down, Edit penalty ou Remove.",
      "Cliquer Recalculate pour recalculer la manche et le classement general.",
    ],
  },
  {
    title: "5. Partager la regate",
    items: [
      "Dans Overview, utiliser Partager avec code.",
      "Partager le code competition ou le lien /join.",
      "Coach et athletes voient la regate en lecture seule.",
    ],
  },
  {
    title: "6. Fin de regate",
    items: [
      "Verifier les resultats et exports PDF/CSV/Excel.",
      "Consulter le podium general, les podiums par categorie et le plus jeune Optimist.",
      "Exporter le PDF officiel depuis Export.",
    ],
  },
];

export default function GuidePage() {
  return (
    <PageShell
      title="RaceSail Guide"
      description="Guide d'utilisation rapide pour organiser, lancer et partager une regate."
      actions={<Button asChild><Link href="/join">Rejoindre une regate</Link></Button>}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader><CardTitle>{section.title}</CardTitle></CardHeader>
            <CardContent>
              <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                {section.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
