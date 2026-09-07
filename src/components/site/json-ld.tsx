import type { Json } from '@/lib/site/seo';

/** Structured data, in the server HTML, identical for a crawler and for a person. */
export function JsonLd({ data }: { data: Json | Json[] }) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <>
      {payload.map((d, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(d).replace(/</g, '\\u003c') }}
        />
      ))}
    </>
  );
}
