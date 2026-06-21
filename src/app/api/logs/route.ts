import { NextResponse } from "next/server";
import { flushOps } from "@/lib/trace";

export async function GET(): Promise<NextResponse> {
  const ops = flushOps();
  return NextResponse.json({
    exported: new Date().toISOString(),
    opCount: ops.length,
    ops,
  });
}
