import katex from "katex";
import "katex/dist/katex.min.css";

// Renderiza LaTeX en el servidor (KaTeX). No requiere JS en el cliente.

export function MathBlock({ tex }: { tex: string }) {
  const html = katex.renderToString(tex, {
    displayMode: true,
    throwOnError: false,
  });
  return (
    <div
      className="my-4 overflow-x-auto text-gray-800"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function MathInline({ tex }: { tex: string }) {
  const html = katex.renderToString(tex, {
    displayMode: false,
    throwOnError: false,
  });
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
