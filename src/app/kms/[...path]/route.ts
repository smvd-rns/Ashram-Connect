import { NextRequest } from "next/server";
import { kmsProxyHandler } from "@/lib/kms-proxy";

interface RouteParams {
  params: Promise<{
    path: string[];
  }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  return kmsProxyHandler(req, path || []);
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  return kmsProxyHandler(req, path || []);
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  return kmsProxyHandler(req, path || []);
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  return kmsProxyHandler(req, path || []);
}

export async function HEAD(req: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  return kmsProxyHandler(req, path || []);
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  return kmsProxyHandler(req, path || []);
}
