import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admin-auth";
import CollectionsList, { type CollectionRow } from "./_components/CollectionsList";

export default async function CollectionsPage() {
  const adminUser = await requireRole(["owner", "admin", "editor"]);
  const canDelete = adminUser.role === "owner" || adminUser.role === "admin";

  const supabase = await createClient();

  const { data: collections } = await supabase
    .from("collections")
    .select(
      "id, name, slug, description, is_active, is_featured, sort_order, meta_title, meta_description",
    )
    .order("sort_order")
    .order("name");

  // Conteo de productos por colección
  const { data: counts } = await supabase
    .from("product_collections")
    .select("collection_id");

  const countMap = new Map<string, number>();
  for (const row of counts ?? []) {
    const cid = (row as { collection_id: string }).collection_id;
    countMap.set(cid, (countMap.get(cid) ?? 0) + 1);
  }

  const rows: CollectionRow[] = (collections ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    is_active: c.is_active,
    is_featured: c.is_featured,
    sort_order: c.sort_order,
    meta_title: c.meta_title,
    meta_description: c.meta_description,
    products_count: countMap.get(c.id) ?? 0,
  }));

  return <CollectionsList rows={rows} canDelete={canDelete} />;
}
