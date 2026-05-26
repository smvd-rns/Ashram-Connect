import { NextRequest } from "next/server";
import { icsProxyHandler } from "@/lib/ics-proxy";

export async function GET(req: NextRequest) {
  return icsProxyHandler(req, [""]);
}

export async function POST(req: NextRequest) {
  return icsProxyHandler(req, [""]);
}

export async function PUT(req: NextRequest) {
  return icsProxyHandler(req, [""]);
}

export async function DELETE(req: NextRequest) {
  return icsProxyHandler(req, [""]);
}

export async function HEAD(req: NextRequest) {
  return icsProxyHandler(req, [""]);
}

export async function PATCH(req: NextRequest) {
  return icsProxyHandler(req, [""]);
}
