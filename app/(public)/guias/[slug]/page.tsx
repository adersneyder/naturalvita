import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleLayout from "../_components/ArticleLayout";
import { getPublishedGuideBySlug } from "@/lib/guias/db";
import { renderMarkdown } from "@/lib/guias/markdown";
import { loadMentions } from "@/lib/guias/load-mentions";
import { COMPANY } from "@/lib/legal/company-info";

type Params = Promise<{ slug: string }>;

// Las guías de BD cambian sin deploy: revalidar cada hora.
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getPublishedGuideBySlug(slug);
  if (!guide) {
    return { title: "Guía no encontrada", robots: { index: false } };
  }
  return {
    title: guide.title,
    description: guide.dek,
    alternates: { canonical: `${COMPANY.url}/guias/${guide.slug}` },
    openGraph: {
      title: guide.title,
      description: guide.dek,
      url: `${COMPANY.url}/guias/${guide.slug}`,
      type: "article",
      images: [{ url: guide.hero_image_url, alt: guide.hero_image_alt }],
      publishedTime: guide.published_at ?? undefined,
    },
  };
}

export default async function DbGuidePage({ params }: { params: Params }) {
  const { slug } = await params;
  const guide = await getPublishedGuideBySlug(slug);
  if (!guide) notFound();

  const productMentions = await loadMentions(
    guide.product_mentions.map((m) => ({
      slug: m.slug,
      whyMentioned: m.why,
    })),
  );

  const publishedDate = (guide.published_at ?? guide.created_at).slice(0, 10);
  const updatedDate = guide.updated_at.slice(0, 10);

  return (
    <ArticleLayout
      slug={guide.slug}
      title={guide.title}
      dek={guide.dek}
      tldr={guide.tldr}
      publishedDate={publishedDate}
      updatedDate={updatedDate !== publishedDate ? updatedDate : undefined}
      author={{
        name: "Equipo editorial NaturalVita",
        role: "Curación clínica del catálogo",
      }}
      readingTime={guide.reading_time}
      heroImage={{ url: guide.hero_image_url, alt: guide.hero_image_alt }}
      sections={guide.sections.map((s) => ({
        id: s.id,
        heading: s.heading,
        body: renderMarkdown(s.body_md),
      }))}
      productMentions={productMentions}
      faqs={guide.faqs.map((f) => ({ q: f.q, a: f.a }))}
    />
  );
}
