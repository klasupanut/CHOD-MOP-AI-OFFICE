import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth/api";

export async function GET() {
  const user = await getApiUser("Quotations");
  if (!user || !user.quotationPermissions.includes("quotation.view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      name: user.name,
      email: user.email,
      role: user.role,
    },
    permissions: user.quotationPermissions,
  });
}
