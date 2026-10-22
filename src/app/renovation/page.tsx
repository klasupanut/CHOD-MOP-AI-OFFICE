import { WarehouseStatusMapFrame } from "@/components/renovation/WarehouseStatusMapFrame";
import { requireModule } from "@/lib/auth/session";

export default async function RenovationPage() {
  const user = await requireModule("Renovation");
  void user;
  return <WarehouseStatusMapFrame />;
}
