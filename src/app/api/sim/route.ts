import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Simulation is client-side in this demo.",
    updated: new Date().toISOString()
  });
}
