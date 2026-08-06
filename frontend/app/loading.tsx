export default function Loading() {
  return (
    <div className="space-y-6" aria-label="Cargando contenido">
      <div className="space-y-3 border-b border-emerald-950/10 pb-6">
        <div className="skeleton h-4 w-32" />
        <div className="skeleton h-8 w-72 max-w-full" />
        <div className="skeleton h-4 w-[32rem] max-w-full" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="skeleton min-h-[30rem]" />
        <div className="skeleton min-h-[22rem]" />
      </div>
    </div>
  );
}
