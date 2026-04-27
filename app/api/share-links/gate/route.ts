import { isShareGateEnabled } from "@/lib/share-access";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ gateEnabled: isShareGateEnabled() });
}
