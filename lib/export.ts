"use client";

import type { Competition, RaceResult } from "@/types";
import type jsPDF from "jspdf";
import { formatRaceCell, getDiscardedRaceNumbers, raceNumbers, rankedAthletes } from "@/lib/scoring";
import { getCountryCode, getFlagEmoji } from "@/lib/flags";

const APP_LOGO_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAYAAABS3GwHAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAy0SURBVHhe7Z3vjxVXGcf9D3p/kPjChBea9I0xjS80MTH61qTaGkkgmGBiialtlQSDCY0NSlvA5ddSCAtbusDaBULYtohAELYFWrQUthRZSCmItmwFVyw/LBUqmuP9np27e3f23L0zc2fOnDPP90k+aUsvc2fOnM8zZ+a5Z85n7vv2YkWIVCgAEQ0FIKKhAEQ0FICIhgIQ0VAAIhoKQERDAYhoKAARDQUgoqEARDQUgIiGAhDRUAAiGgpAREMBiGgoABENBSCioQBENBSAiIYCENFQACIaCkBEQwGIaCgAEQ0FIKKhAJb5+rxutWz7EbVi5+v6n99/dqfxc8QOFMAyj3XuVo2xbeC08XPEDhTAMhTALSiAZSiAW1AAy2zc81bQ9UeDAuQLBbDIZ7+3RP3z1idB1x8NCpAvFMAiCzcdCLr9eFCAfKEAlkD2//v1j4NuPx4UIF8ogCVM2R9BAfKFAligWfZHUIB8oQAWaJb9ERQgXyhAxkyf1dE0+yMoQL5QgIzp2n086OrmoAD5QgEy5P45q9SdT+8FXd0cFCBfKECGTJX9X712RY3cvUMBcoYCZESr7L/jw0vqp0PHKUDOUICMaDX2hwDTDmxXiw/90fj3iR0oQAZEGfvXBfjigZdU6btPG7dDsocCZMDeN98NunnzqAsAyk+vM26HZA8FSBlMeYwSjQJU925TpTnLjNsj2UIBUiZK9kc0CgAq3ZuM2yPZQgFSJGr2R4QFAOX5q4zbJdlBAVIkavZHmASovvwbdd+MZ4zbJtlAAVIiTvZHmAQAlZUbjdsn2UABUuLE+eGga0eLZgKA0twO43eQ9KEAKYCXW8WNqQSo9m1hbcASFCAFzly6GnTr6DGVAKC8aK3xu0i6UIA2SZL9Ea0E0LWB2UuN30nSgwK0SZLsj2glAGBtIHsoQBskzf6IKAIA1gayhQIkBBPdk2Z/RFQBWBvIFgqQkKkmukeJqAKASkeXcR9I+1CABEz1mpOoEUcAUPrhr437QtqDAiSg3eyPiCsAagOmfSHtQQFikkb2R8QVAJSfes64TyQ5FCAmaWR/RBIBdG1g5hLjfpFkUIAYpJX9EUkEANUNzxv3jSSDAsSg1UT3OJFUAFCax9pAWlCAiESZ6B4n2hEAtQH+WC4dKEBE0sz+iHYEAKwNpAMFiEDa2R/RrgCAtYH2oQARSDv7I9IQgLWB9qEALcgi+yPSEACwNtAeFKAF/UfPBl023UhLgGl7+lgbaAMKMAVxJ7rHidQEqFFZx9pAUijAFMR5zUncSFMAUH5ipfEYyNRQgCZkmf0RaQswbVcvawMJoABNyDL7I1IXoEZl6XrjsZDmUAADWWd/RBYC6B/LsTYQCwpg4NDgxaCbZhdZCACqvZuNx0TMUIAQ7Ux0jxNZCQDKCzuNx0YmQwFCtDPRPU5kKQBrA9GhAA3Yyv6ITAWowdpANChAA7ayPyJrAQBrA62hAAE2sz/ChgDVHVtZG2gBBQiwmf0RNgQAXIBvaihAjbQmuscJWwJwAb6pES9AmhPd44QtAUC1p8d47IQC5JL9ETYFAOUFq43HLx3RAuSV/RG2BdAT6VkbmIRoAfLK/gjbAoDqmm5jO0hGrAB5Zn9EHgKA0qMrjO0hFbECrN51LOiK+UReArA2MBGRAmQ10T1O5CUAYG1gHJECZPGak7iRpwCsDYwjTgAXsj8iTwEAawOjiBPAheyPyFsAwAX4hAngSvZHuCAAF+ATJkDP/sGg++UfLggAKis3GttKCmIEsDHRPU64IgAoze0wtpkExAiQ9WtO4oZLAuAlu1JrAyIEcC37I1wSAJQXrTW2XdERIYBr2R/hmgC6NjB7qbH9ikzhBXAx+yNcEwBUujcZ27DIFF4AF7M/wkUBgLTaQKEFsD3RPU64KoC02kChBbA90T1OuCoAkFQbKKwALmd/hMsCACkv2S2sAC5nf4TrAkhZgK+QArie/RGuCwAkLMBXSAFcz/4IHwTQtYGCT6QvnADz1+8Nupjb4YMAoLqh2C/ZLZQAeU90jxO+CABK84pbGyiUAHm+5iRu+CSAfqdQQX8sVxgBfMr+CJ8EAJWOLmO7+05hBPAp+yN8EwAUsTZQCAF8y/4IHwUoYm2gEAL8autA0K3cjhPnh9XeN88H/6XUhdu31OMHX9PLGWGcbep0rlG02oD3Arg00T0cqEfgDXQzfrlNX6Wwv4917g7+72hsGzg9dix4Vw9WeHRZiKLVBrwXwJXXnCDeG76m9weV6OmzzPNspxIgjKtCFGkBPq8FyDv7fzByQ3fgR5b3630x7WOYOAKEcUmIoizA57UAtrM/brT7j57VnfhLjyQbC7cjQJhchdjVW4jagLcC2Mj+N2/f0TPK8Ij1Kz9eb9yPuKQpQBjbQlSWptMmeeKtAFlkfwh1aPCifqqEucSm722XLAUIk7UQ+obY89qAlwKkOdH9jTN/Vcu2H1EPPtlr/K60sSlAmCyEqPZuNn6XL3gpQDsT3fEsPvxo0iZ5ChAmLSGwDdP2fcA7AeJm/yiPJm3ikgBhEguxp8/b2oB3ArTK/ng0iZfgxnk0aROXBQgTRwh8xrQN1/FKAFP2T+PRpE18EiBMKyF8rA14JQCyf/3RJGZ+pfVo0iY+CxBmkhAe1ga8uwKY/twniiRAGAjh20u1vLsH8J0iC+AjFMAyFMAtKIBlKIBbUADLUAC3oACWoQBuQQEsQwHcggJYhgK4BQWwDAVwCwpgGQrgFhTAMhTALSiAZSiAW1AAy1AAt6AAlqEAbkEBLEMB3IICWAZzkTERvw7eQGH6HLEDBSCioQBENBSAiIYCENFQACIaCkBEQwGIaCgAEQ0FIKKhAEQ0FICIhgIQ0VAAIhoKQERDAYhoKAARjZMClOatKsxK5GQcvaDGU26t4uOcAGgkLLqm150qwELMZJTy/FVj5xX/bvpMHjglAJbXqe7YOmHdKaxD6/tizJLB6pHVNd0TzykW2MZqMobP28YpAbDWVGNDNVLp6PJu+R3pYLhTz/phkOhcOJ/OCIDsX+neZGysMWqNWX56HUVwnPKC1XrBPOM5DIAALlwFnLsHKC9aa2ywCdREwBXBtDhzHqu/k1GidHyg1xR2JIk5JwAoPboiUkMCNGb9iRFWg8e6wVhCNbxN0j5YlvbQ4EW1bPuRsT9DFkcyirSyPK7gfAoUDQyJMNzBDZOxMcPUhDlz9Vrwuiml3hu+poUwbZvEY/qsDt3p73x6T7ftnf/cUw8seUE/oDCeCwNIVKYrdt44K0Cd0uylqrqh+c1xnV+8+7Y+OeE4cX5YXxFwEk3bJ8158Mle1bN/cKzjN8a+kWHjeQhT7duir+im7buA8wLU0SKs6W56RVj+56Hg1DSP/mNneVVoARYj79p9XI3c+DhoNXMc+2hEfWGg33guQLWnx+mOX8cbAergMooCmWnM+eWjv9WZqVWM3P5EbTt5Vj3+wj51/xx3ijJ5gUzfdfCk+uD6raCFmsfI3TvqJ0PHJ7U9QHJCkvKpbuOdAI2gomh6dPqt4wfVyRvj9wOt4sLNm2rzO2fV3L6aED/vMn5XUcBQcMbaftV5+IQ6dvlvQQu0jsv/vq2HmZ87uHNSe2OYU17Y6eXjaa8FqIPhEZ4u4EQ0npivvbFXbXz/vM5acQIn+9g/rqqOU6fU3JcOqG8816cv55razblpH1wD+wqZv/P8LvWzfYfV5tPn1ND1j4IjjBZ3//df9fKV99WP/vSHCe2q2dU7+ijakYpuUgohQCPNZJg5eFjt+PCSPqlJY+hf1/UQC/cby8+dVnMGBtRD+/err3aNFuhwRRoTBaQ4FMDQb8K2a+A4H1jbqx7q/53el44z7+gOi/F50mjs9JOyfb3TF+inKYUTYAK1SzJ+WaqfUwdC4KRChjV/ORdrmBQ10PkaefXalVFhmoBOiytNI6bP1Ts2iHtFaxW44iE5hDs97rN0nWXBap1YjG3sOcUWIEwghK4v9PTowgyeZPzg1Ot6qHThduubwCIEjnPL5Yu6w+PBge7suIGttQkeMOgO7/nQJiqyBDCAE42hS10K/EYFN9HoHMi8yLjIkD4GhjPYf1w9cCwQXT+6xFCme9PosO2JlYXN7lEQL0AzSnM7xsSorNyo5cB4f+Zbr00aluDeIK/AMA77UB9q4RHlwycG1OdffHE0o9f2XXf0hZ36voE/JJwIBUhI402p7mC4gqzpVt985RUtCnj4yO911q0Lk5Rnht4e2ybQV6r6cAXfXb/55ryJ2FCAnEGnrYvEDmwfCkBEQwGIaCgAEQ0FIKKhAEQ0FICIhgIQ0VAAIhoKQERDAYhoKAARDQUgoqEARDCL1f8BaFpcdLwL5vgAAAAASUVORK5CYII=";

const FEDERATION_LOGO_BASE64 = APP_LOGO_BASE64;

function exportRows(competition: Competition) {
  const races = raceNumbers(competition.raceCount);
  return rankedAthletes(competition.athletes, competition.raceCount).map((athlete) => {
    const discarded = getDiscardedRaceNumbers(athlete, competition.raceCount);
    return {
      Rank: athlete.rank,
      Sail: athlete.sailNumber,
      Flag: getFlagEmoji(athlete.nationality),
      Athlete: `${athlete.firstName} ${athlete.lastName}`,
      Sex: athlete.sex,
      Category: athlete.category,
      Nationality: athlete.nationality,
      "Club Logo": athlete.clubLogo ? "Yes" : "",
      Club: athlete.clubName,
      ...Object.fromEntries(races.map((raceNumber) => [`Race ${raceNumber}`, formatRaceCell(athlete.results[raceNumber], discarded.has(raceNumber))])),
      Total: athlete.total,
      Discard: athlete.discard ?? 0,
      Net: athlete.net,
      "Final Rank": athlete.rank,
    };
  });
}

export function downloadCsv(competition: Competition) {
  const rows = exportRows(competition);
  const headers = Object.keys(rows[0] ?? { Rank: "", Sail: "", Flag: "", Athlete: "", Total: "", Discard: "", Net: "", "Final Rank": "" });
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => JSON.stringify(String(row[header as keyof typeof row] ?? ""))).join(",")),
  ].join("\n");
  downloadBlob(csv, `${competition.name}-results.csv`, "text/csv;charset=utf-8;");
}

export async function downloadExcel(competition: Competition) {
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.json_to_sheet(exportRows(competition));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
  XLSX.writeFile(workbook, `${competition.name}-results.xlsx`);
}

export async function downloadPdf(competition: Competition) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ orientation: "landscape" });
  const races = raceNumbers(competition.raceCount);
  const rows = rankedAthletes(competition.athletes, competition.raceCount);
  const discards = competition.raceCount >= 4 ? 1 : 0;
  const toCount = Math.max(0, competition.raceCount - discards);
  const pageWidth = doc.internal.pageSize.getWidth();

  addLogo(doc, competition.clubLogo, 14, 10);
  addLogo(doc, competition.competitionLogo, 36, 10);
  addLogo(doc, FEDERATION_LOGO_BASE64, pageWidth - 32, 10);

  doc.setFontSize(10);
  doc.text(competition.clubName, 14, 34);
  doc.setFontSize(18);
  doc.text(competition.name, pageWidth / 2, 20, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Club: ${competition.clubName}`, 14, 44);
  doc.text(`Location: ${competition.location}`, 14, 50);
  doc.text(`Date: ${new Date(competition.date).toLocaleDateString()}`, 14, 56);
  doc.text(`Boat class: ${competition.boatClass}`, 14, 62);
  doc.setFontSize(14);
  doc.text(`${String(competition.boatClass).toUpperCase()} FINAL RESULTS`, pageWidth / 2, 42, { align: "center" });
  doc.setFontSize(10);
  doc.text("Overall", pageWidth / 2, 49, { align: "center" });
  doc.text(`Sailed: ${competition.raceCount}, Discards: ${discards}, To count: ${toCount}, Entries: ${rows.length}, Scoring system: Appendix A`, pageWidth / 2, 62, { align: "center" });

  autoTable(doc, {
    startY: 68,
    head: [["Rank", "Nat", "Club", "J", "S", "SailNo", "Name", ...races.map((race) => `R${race}`), "Total", "Nett"]],
    body: rows.map((athlete) => {
      const discarded = getDiscardedRaceNumbers(athlete, competition.raceCount);
      const countryCode = getCountryCode(athlete.nationality);
      return [
        athlete.rank,
        countryCode,
        athlete.clubName,
        athlete.category === "B" ? "B" : athlete.category === "J" ? "J" : "",
        athlete.sex,
        athlete.sailNumber,
        `${athlete.firstName} ${athlete.lastName}`,
        ...races.map((raceNumber) => formatPdfRaceCell(athlete.results[raceNumber], discarded.has(raceNumber))),
        athlete.total.toFixed(1),
        athlete.net.toFixed(1),
      ];
    }),
    styles: { fontSize: 7, cellPadding: 1.4, lineColor: [180, 180, 180], lineWidth: 0.1 },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineColor: [80, 80, 80], lineWidth: 0.2 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { bottom: 24 },
  });

  addPrizesPage(doc, autoTable, competition);
  addPdfFooter(doc, APP_LOGO_BASE64);
  doc.save(`${competition.name}-results.pdf`);
}

function formatPdfRaceCell(result: RaceResult | undefined, isDiscarded: boolean) {
  if (!result) return "";
  const value = result.penalty !== "OK"
    ? `${Number(result.points ?? 0).toFixed(1)} ${result.penalty}`
    : Number(result.points ?? 0).toFixed(1);
  return isDiscarded ? `(${value})` : value;
}

function addPrizesPage(doc: jsPDF, autoTable: typeof import("jspdf-autotable").default, competition: Competition) {
  const rows = rankedAthletes(competition.athletes, competition.raceCount);
  const prizeRows = [
    ...rows.slice(0, 3).map((athlete, index) => ["OVERALL", index + 1, `${athlete.firstName} ${athlete.lastName}`]),
    ...rows.filter((athlete) => athlete.sex === "F").slice(0, 3).map((athlete, index) => ["GIRLS", index + 1, `${athlete.firstName} ${athlete.lastName}`]),
    ...rows.filter((athlete) => athlete.category === "B").slice(0, 3).map((athlete, index) => ["BENJAMIN", index + 1, `${athlete.firstName} ${athlete.lastName}`]),
    ...rows.filter((athlete) => athlete.category === "J").slice(0, 3).map((athlete, index) => ["JUNIOR", index + 1, `${athlete.firstName} ${athlete.lastName}`]),
  ];
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.addPage();
  doc.setFontSize(16);
  doc.text("PRIZES", pageWidth / 2, 22, { align: "center" });
  autoTable(doc, {
    startY: 34,
    head: [["Category", "Rank", "Competitor"]],
    body: prizeRows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [3, 105, 161] },
  });
  doc.setFontSize(10);
  doc.text("JURY CHAIRMAN", 40, 170);
  doc.line(25, 162, 85, 162);
  doc.text("INTERNATIONAL RACE OFFICER", pageWidth - 95, 170);
  doc.line(pageWidth - 105, 162, pageWidth - 35, 162);
}

function addLogo(doc: jsPDF, logo: string | undefined, x: number, y: number) {
  if (!logo) return;
  try {
    if (!logo.startsWith("data:image")) return;
    const format = logo.includes("image/png") ? "PNG" : "JPEG";
    doc.addImage(logo, format, x, y, 18, 18);
  } catch (error) {
    console.warn("PDF image skipped", error);
  }
}

function addPdfFooter(doc: jsPDF, appLogoBase64?: string) {
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFontSize(8);
    doc.text(`Page ${i} / ${pageCount}`, pageWidth - 25, pageHeight - 10);
    doc.text("Developed by Mouad Mouasseif", 14, pageHeight - 10);
    doc.textWithLink("mouadmouasseif", 14, pageHeight - 5, {
      url: "https://mouadmouasseif.vercel.app/",
    });

    if (appLogoBase64?.startsWith("data:image")) {
      try {
        doc.addImage(appLogoBase64, "PNG", pageWidth / 2 - 8, pageHeight - 16, 16, 16);
      } catch (error) {
        console.warn("PDF footer image skipped", error);
      }
    }
  }
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
