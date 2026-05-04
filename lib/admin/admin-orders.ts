import { createClient } from "@/lib/supabase/server";

export type AdminOrderRow = {
  id: string;
  order_number: string;
  customer_email: string;
  customer_name: string;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  total_cop: number;
  created_at: string;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  shipping_city: string;
  shipping_department: string;
  items_count: number;
};

export type AdminOrderDetail = AdminOrderRow & {
  customer_id: string | null;
  customer_phone: string | null;
  subtotal_cop: number;
  shipping_cop: number;
  tax_cop: number;
  discount_cop: number;
  shipping_recipient: string;
  shipping_phone: string;
  shipping_street: string;
  shipping_details: string | null;
  shipping_postal_code: string | null;
  bold_payment_id: string | null;
  tracking_number: string | null;
  notes: string | null;
  updated_at: string;
  items: Array<{
    product_id: string;
    product_name: string;
    product_sku: string | null;
    product_image_url: string | null;
    quantity: number;
    unit_price_cop: number;
    subtotal_cop: number;
  }>;
};

export type ListAdminOrdersInput = {
  search?: string;
  status?: string;
  payment_status?: string;
  page?: number;
  pageSize?: number;
};

export type ListAdminOrdersResult = {
  rows: AdminOrderRow[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listAdminOrders(
  input: ListAdminOrdersInput = {},
): Promise<ListAdminOrdersResult> {
  const supabase = await createClient();
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, input.pageSize ?? 25));
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("orders")
    .select(
      `id, order_number, customer_email, customer_name,
       status, payment_status, fulfillment_status, total_cop,
       created_at, paid_at, shipped_at, delivered_at,
       shipping_city, shipping_department,
       items:order_items!order_id(quantity)`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  // Búsqueda por order_number, email, customer_name
  if (input.search?.trim()) {
    const term = input.search.trim();
    query = query.or(
      `order_number.ilike.%${term}%,customer_email.ilike.%${term}%,customer_name.ilike.%${term}%`,
    );
  }
  if (input.status && input.status !== "all") {
    query = query.eq("status", input.status);
  }
  if (input.payment_status && input.payment_status !== "all") {
    query = query.eq("payment_status", input.payment_status);
  }

  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;
  if (error) {
    console.error("[listAdminOrders]", error);
    return { rows: [], total: 0, page, pageSize };
  }

  type Row = Omit<AdminOrderRow, "items_count"> & {
    items: Array<{ quantity: number }>;
  };

  const rows: AdminOrderRow[] = (data as Row[]).map((row) => ({
    id: row.id,
    order_number: row.order_number,
    customer_email: row.customer_email,
    customer_name: row.customer_name,
    status: row.status,
    payment_status: row.payment_status,
    fulfillment_status: row.fulfillment_status,
    total_cop: row.total_cop,
    created_at: row.created_at,
    paid_at: row.paid_at,
    shipped_at: row.shipped_at,
    delivered_at: row.delivered_at,
    shipping_city: row.shipping_city,
    shipping_department: row.shipping_department,
    items_count: row.items.reduce((acc, i) => acc + i.quantity, 0),
  }));

  return { rows, total: count ?? 0, page, pageSize };
}

export async function getAdminOrderDetail(
  id: string,
): Promise<AdminOrderDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      `id, order_number, customer_id, customer_email, customer_name, customer_phone,
       status, payment_status, fulfillment_status,
       total_cop, subtotal_cop, shipping_cop, tax_cop, discount_cop,
       created_at, paid_at, shipped_at, delivered_at, updated_at,
       shipping_recipient, shipping_phone, shipping_street, shipping_details,
       shipping_city, shipping_department, shipping_postal_code,
       tracking_number, notes, bold_payment_id,
       items:order_items!order_id(
         product_id, product_name, product_sku, product_image_url,
         quantity, unit_price_cop, subtotal_cop
       )`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[getAdminOrderDetail]", error);
    return null;
  }

  const detail = data as AdminOrderDetail & { items: AdminOrderDetail["items"] };
  return {
    ...detail,
    items_count: detail.items.reduce((acc, i) => acc + i.quantity, 0),
  };
}

export type AdminCustomerRow = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  orders_count: number;
  total_spent: number;
};

export async function listAdminCustomers(): Promise<AdminCustomerRow[]> {
  const supabase = await createClient();

  // Cargar customers + sus pedidos pagados
  const { data: customers, error } = await supabase
    .from("customers")
    .select(
      `id, email, full_name, phone, created_at,
       orders:orders!customer_id(total_cop, payment_status)`,
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[listAdminCustomers]", error);
    return [];
  }

  type Row = {
    id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
    created_at: string;
    orders: Array<{ total_cop: number; payment_status: string }>;
  };

  return (customers as Row[]).map((c) => {
    const paidOrders = c.orders.filter((o) => o.payment_status === "paid");
    return {
      id: c.id,
      email: c.email,
      full_name: c.full_name,
      phone: c.phone,
      created_at: c.created_at,
      orders_count: c.orders.length,
      total_spent: paidOrders.reduce((acc, o) => acc + o.total_cop, 0),
    };
  });
}
