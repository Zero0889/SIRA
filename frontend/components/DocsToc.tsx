"use client";

import { useEffect, useState } from "react";
import { BookOpenText } from "@phosphor-icons/react";

// Navegación lateral con scrollspy. En móvil se convierte en una franja horizontal.
export function DocsToc({ items }: { items: { id: string; label: string; group?: string }[] }) {
  const [active, setActive] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibles = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visibles[0]) setActive(visibles[0].target.id);
      },
      { rootMargin: "-15% 0px -75% 0px", threshold: 0 }
    );
    items.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label="Contenido de la documentación">
      <div className="mb-4 hidden items-center gap-3 border-b border-emerald-950/10 px-2 pb-4 lg:flex">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border bg-white text-emerald-800">
          <BookOpenText size={19} weight="duotone" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-bold text-gray-900">Documentación</p>
          <p className="text-xs text-gray-500">14 temas · lectura guiada</p>
        </div>
      </div>
      <ul className="hide-scrollbar flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
        {items.map((item, index) => (
          <li key={item.id} className="shrink-0 lg:shrink">
            {item.group && (index === 0 || items[index - 1]?.group !== item.group) && (
              <div className="mb-1 mt-5 hidden px-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-400 first:mt-0 lg:block">{item.group}</div>
            )}
            <a
              href={`#${item.id}`}
              aria-current={active === item.id ? "location" : undefined}
              className={`relative block rounded-lg border px-3 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sira-green/30 lg:w-full ${
                active === item.id
                  ? "border-[#17643a]/25 bg-[#e7f3eb] font-semibold text-[#10502e]"
                  : "border-transparent text-gray-600 hover:border-emerald-950/10 hover:bg-[#f4f7f4] hover:text-gray-900"
              }`}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
