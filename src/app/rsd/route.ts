import { NextRequest } from "next/server";
import { rsdProxyHandler } from "@/lib/rsd-proxy";

export async function GET(req: NextRequest) {
  return rsdProxyHandler(req, [""]);
}

export async function POST(req: NextRequest) {
  return rsdProxyHandler(req, [""]);
}

export async function PUT(req: NextRequest) {
  return rsdProxyHandler(req, [""]);
}

export async function DELETE(req: NextRequest) {
  return rsdProxyHandler(req, [""]);
}

export async function HEAD(req: NextRequest) {
  return rsdProxyHandler(req, [""]);
}

export async function PATCH(req: NextRequest) {
  return rsdProxyHandler(req, [""]);
}
