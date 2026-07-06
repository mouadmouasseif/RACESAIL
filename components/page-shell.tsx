import { Anchor, Waves } from "lucide-react";

export function PageShell({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="wave-band mb-6 overflow-hidden rounded-lg border bg-gradient-to-r from-sky-900 via-sky-700 to-cyan-600 text-white shadow-soft">
        <div className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-cyan-100">
              <Waves className="h-4 w-4" />
              Club race office
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
            {description ? <p className="mt-2 max-w-2xl text-sm text-sky-50 md:text-base">{description}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="hidden h-16 w-16 items-center justify-center rounded-lg bg-white/15 md:flex">
              <Anchor className="h-8 w-8" />
            </div>
            {actions}
          </div>
        </div>
      </section>
      {children}
    </main>
  );
}
