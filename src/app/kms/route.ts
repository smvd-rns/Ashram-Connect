import { NextRequest } from "next/server";
import { kmsProxyHandler } from "@/lib/kms-proxy";

export async function GET(req: NextRequest) {
  return kmsProxyHandler(req, [""]);
}

export async function POST(req: NextRequest) {
  return kmsProxyHandler(req, [""]);
}

export async function PUT(req: NextRequest) {
  return kmsProxyHandler(req, [""]);
}

export async function DELETE(req: NextRequest) {
  return kmsProxyHandler(req, [""]);
}

export async function HEAD(req: NextRequest) {
  return kmsProxyHandler(req, [""]);
}

export async function PATCH(req: NextRequest) {
  return kmsProxyHandler(req, [""]);
}
