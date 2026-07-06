import { z } from "zod";
import { boatClasses, penaltyCodes } from "@/types";

export const competitionSchema = z.object({
  name: z.string().min(2, "Competition name is required"),
  clubName: z.string().min(2, "Club name is required"),
  location: z.string().min(2, "Location is required"),
  date: z.string().min(1, "Date is required"),
  boatClass: z.enum(boatClasses),
  raceCount: z.coerce.number().int().min(1, "Minimum 1 race").max(9, "Maximum 9 races"),
});

export const athleteSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  age: z.coerce.number().int().min(5, "Age is too low").max(100, "Age is too high"),
  sex: z.enum(["M", "F"]),
  nationality: z.string().min(2, "Nationality is required"),
  clubName: z.string().min(2, "Club is required"),
  sailNumber: z.string().min(1, "Sail number is required"),
  boatClass: z.enum(boatClasses),
  licenseNumber: z.string().optional(),
});

export const raceResultSchema = z
  .object({
    raceNumber: z.coerce.number().int().min(1).max(9),
    sailNumber: z.string().min(1, "Sail number is required"),
    position: z.coerce.number().int().min(1).optional().or(z.literal("").transform(() => undefined)),
    penalty: z.enum(penaltyCodes),
    notes: z.string().optional(),
  })
  .refine((value) => value.penalty !== "OK" || typeof value.position === "number", {
    message: "Finish position is required when penalty is OK",
    path: ["position"],
  });

export type CompetitionFormValues = z.infer<typeof competitionSchema>;
export type AthleteFormValues = z.infer<typeof athleteSchema>;
export type RaceResultFormValues = z.infer<typeof raceResultSchema>;
