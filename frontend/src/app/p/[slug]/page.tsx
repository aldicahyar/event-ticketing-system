import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { CmsPage } from '@/types/page';

const API_URL =
  process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Fetch a published CMS page by slug from the public API.
 * Returns null on 404 / any error so the route can render notFound().
 * Revalidates every 60s (ISR) so edits appear without a redeploy.
 */
async function fetchPage(slug: string): Promise<CmsPage | null> {
  try {
    const res = await fetch(`${API_URL}/public/pages/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    // Backend wraps payloads as { success, data, message, ... }
    return (json?.data ?? null) as CmsPage | null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await fetchPage(slug);
  if (!page) return { title: 'Page not found' };

  const title = page.seoTitle || page.title;
  const description = page.seoDescription || page.excerpt || undefined;
  const ogImage = page.ogImage?.url ? `${API_URL}${page.ogImage.url}` : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
  };
}

export default async function PublicCmsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await fetchPage(slug);
  if (!page) notFound();

  return (
    <main className="min-h-screen bg-black text-white font-mono">
      <article className="container mx-auto px-4 md:px-6 py-12 md:py-20 max-w-3xl">
        <header className="mb-8 border-b border-mono-dark-grey pb-6">
          <h1 className="font-display font-bold text-3xl md:text-5xl uppercase text-white">
            {page.title}
          </h1>
          {page.excerpt && (
            <p className="text-mono-light-grey mt-3 text-sm md:text-base">{page.excerpt}</p>
          )}
        </header>

        {/*
          content is sanitized server-side on write (HtmlSanitizerService),
          so rendering it here is safe.
        */}
        <div
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </article>
    </main>
  );
}
