import { NextRequest } from "next/server";
import { rsdProxyHandler } from "@/lib/rsd-proxy";

interface RouteParams {
  params: Promise<{
    path: string[];
  }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  return rsdProxyHandler(req, path || []);
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  return rsdProxyHandler(req, path || []);
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  return rsdProxyHandler(req, path || []);
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  return rsdProxyHandler(req, path || []);
}

export async function HEAD(req: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  return rsdProxyHandler(req, path || []);
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  return rsdProxyHandler(req, path || []);
}
