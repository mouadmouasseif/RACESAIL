"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, UserPlus, X } from "lucide-react";
import { boatClasses, type Athlete, type Competition } from "@/types";
import { athleteSchema, type AthleteFormValues } from "@/lib/validations";
import { createId, fileToDataUrl } from "@/lib/utils";
import { getFlagForNationality } from "@/lib/flags";
import { rankAthletes } from "@/lib/scoring";
import { competitionStore } from "@/services/localStorageService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AthleteForm({
  competition,
  onSaved,
  editingAthlete,
  onCancelEdit,
}: {
  competition: Competition;
  onSaved: (competition: Competition) => void;
  editingAthlete?: Athlete;
  onCancelEdit?: () => void;
}) {
  const [clubLogo, setClubLogo] = useState<string | undefined>(editingAthlete?.clubLogo);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<AthleteFormValues>({
    resolver: zodResolver(athleteSchema),
    defaultValues: editingAthlete ? {
      firstName: editingAthlete.firstName,
      lastName: editingAthlete.lastName,
      age: editingAthlete.age,
      nationality: editingAthlete.nationality,
      clubName: editingAthlete.clubName,
      sailNumber: editingAthlete.sailNumber,
      boatClass: editingAthlete.boatClass,
      licenseNumber: editingAthlete.licenseNumber,
    } : { boatClass: competition.boatClass },
  });

  useEffect(() => {
    if (editingAthlete) {
      reset({
        firstName: editingAthlete.firstName,
        lastName: editingAthlete.lastName,
        age: editingAthlete.age,
        nationality: editingAthlete.nationality,
        clubName: editingAthlete.clubName,
        sailNumber: editingAthlete.sailNumber,
        boatClass: editingAthlete.boatClass,
        licenseNumber: editingAthlete.licenseNumber,
      });
      setClubLogo(editingAthlete.clubLogo);
      return;
    }

    reset({ boatClass: competition.boatClass });
    setClubLogo(undefined);
  }, [competition.boatClass, editingAthlete, reset]);

  async function handleLogo(fileList: FileList | null) {
    const file = fileList?.[0];
    if (file) setClubLogo(await fileToDataUrl(file));
  }

  function onSubmit(values: AthleteFormValues) {
    if (editingAthlete) {
      const oldSailNumber = editingAthlete.sailNumber;
      const updated = competitionStore.update(competition.id, (current) => {
        const athletes = current.athletes.map((athlete) => {
          if (athlete.id !== editingAthlete.id) return athlete;
          const results = Object.fromEntries(
            Object.entries(athlete.results).map(([raceNumber, result]) => [
              raceNumber,
              { ...result, sailNumber: values.sailNumber },
            ]),
          );

          return {
            ...athlete,
            ...values,
            flag: getFlagForNationality(values.nationality),
            clubLogo,
            results,
          };
        });

        return {
          ...current,
          athletes: rankAthletes(athletes, current.raceCount),
          races: current.races.map((race) => ({
            ...race,
            results: race.results.map((result) =>
              result.sailNumber === oldSailNumber ? { ...result, sailNumber: values.sailNumber } : result,
            ),
          })),
          updatedAt: new Date().toISOString(),
        };
      });

      if (updated) onSaved(updated);
      onCancelEdit?.();
      return;
    }

    const athlete: Athlete = {
      id: createId("athlete"),
      ...values,
      flag: getFlagForNationality(values.nationality),
      clubLogo,
      results: {},
      total: 0,
      discard: 0,
      net: 0,
      rank: competition.athletes.length + 1,
    };

    const updated = competitionStore.update(competition.id, (current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      athletes: rankAthletes([...current.athletes, athlete], current.raceCount),
    }));

    if (updated) onSaved(updated);
    setClubLogo(undefined);
    reset({ boatClass: competition.boatClass });
  }

  return (
    <Card>
      <CardHeader><CardTitle>{editingAthlete ? "Edit athlete" : "Add athlete"}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-3">
          <Field label="First name" error={errors.firstName?.message}><Input {...register("firstName")} /></Field>
          <Field label="Last name" error={errors.lastName?.message}><Input {...register("lastName")} /></Field>
          <Field label="Age" error={errors.age?.message}><Input type="number" {...register("age")} /></Field>
          <Field label="Nationality" error={errors.nationality?.message}><Input {...register("nationality")} placeholder="Morocco" /></Field>
          <Field label="Club name" error={errors.clubName?.message}><Input {...register("clubName")} /></Field>
          <Field label="Club logo"><Input type="file" accept="image/*" onChange={(event) => handleLogo(event.target.files)} /></Field>
          <Field label="Sail number" error={errors.sailNumber?.message}><Input {...register("sailNumber")} placeholder="MAR 121" /></Field>
          <Field label="Boat class" error={errors.boatClass?.message}>
            <Select value={watch("boatClass")} onValueChange={(value) => setValue("boatClass", value as AthleteFormValues["boatClass"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{boatClasses.map((boatClass) => <SelectItem key={boatClass} value={boatClass}>{boatClass}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="License number" error={errors.licenseNumber?.message}><Input {...register("licenseNumber")} /></Field>
          <div className="flex flex-wrap gap-2 md:col-span-3">
            <Button type="submit" disabled={isSubmitting}>
              {editingAthlete ? <Save className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {editingAthlete ? "Save athlete" : "Add athlete"}
            </Button>
            {editingAthlete ? (
              <Button type="button" variant="outline" onClick={onCancelEdit}>
                <X className="h-4 w-4" /> Cancel
              </Button>
            ) : null}
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
