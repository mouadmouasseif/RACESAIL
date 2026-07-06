"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { boatClasses, type Competition } from "@/types";
import { competitionSchema, type CompetitionFormValues } from "@/lib/validations";
import { createId, fileToDataUrl } from "@/lib/utils";
import { competitionStore } from "@/services/localStorageService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CompetitionForm() {
  const router = useRouter();
  const [clubLogo, setClubLogo] = useState<string>();
  const [competitionLogo, setCompetitionLogo] = useState<string>();
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<CompetitionFormValues>({
    resolver: zodResolver(competitionSchema),
    defaultValues: { boatClass: "Optimist", raceCount: 5, date: new Date().toISOString().slice(0, 10) },
  });

  async function handleLogo(fileList: FileList | null, setter: (value: string) => void) {
    const file = fileList?.[0];
    if (file) setter(await fileToDataUrl(file));
  }

  function onSubmit(values: CompetitionFormValues) {
    const competition: Competition = {
      id: createId("competition"),
      ...values,
      clubLogo,
      competitionLogo,
      scoringSystem: "Low Point",
      athletes: [],
      races: Array.from({ length: values.raceCount }, (_, index) => ({
        raceNumber: index + 1,
        status: "Draft",
        results: [],
        updatedAt: new Date().toISOString(),
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    competitionStore.create(competition);
    router.push(`/competitions/${competition.id}`);
  }

  return (
    <Card>
      <CardHeader><CardTitle>Create competition</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 md:grid-cols-2">
          <Field label="Competition name" error={errors.name?.message}><Input {...register("name")} placeholder="International Optimist Cup" /></Field>
          <Field label="Club name" error={errors.clubName?.message}><Input {...register("clubName")} placeholder="Royal Sailing Club" /></Field>
          <Field label="Club logo"><Input type="file" accept="image/*" onChange={(event) => handleLogo(event.target.files, setClubLogo)} /></Field>
          <Field label="Competition logo"><Input type="file" accept="image/*" onChange={(event) => handleLogo(event.target.files, setCompetitionLogo)} /></Field>
          <Field label="Location" error={errors.location?.message}><Input {...register("location")} placeholder="Casablanca, Morocco" /></Field>
          <Field label="Date" error={errors.date?.message}><Input type="date" {...register("date")} /></Field>
          <Field label="Boat class" error={errors.boatClass?.message}>
            <Select value={watch("boatClass")} onValueChange={(value) => setValue("boatClass", value as CompetitionFormValues["boatClass"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{boatClasses.map((boatClass) => <SelectItem key={boatClass} value={boatClass}>{boatClass}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Number of races" error={errors.raceCount?.message}><Input type="number" min={1} max={9} {...register("raceCount")} /></Field>
          <div className="rounded-lg border bg-secondary p-4 md:col-span-2">
            <p className="text-sm font-semibold text-sky-950">Scoring system</p>
            <p className="text-sm text-sky-800">Low Point system is active by default. Lowest net score wins.</p>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={isSubmitting}><Save className="h-4 w-4" /> Create Competition</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
