import { getAdminUser } from "@/lib/admin-auth";
import NewGuideWizard from "./_NewGuideWizard";

export const dynamic = "force-dynamic";

export default async function NuevaGuiaPage() {
  await getAdminUser();
  return <NewGuideWizard />;
}
