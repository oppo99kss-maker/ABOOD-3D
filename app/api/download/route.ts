import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const filePath = path.join(process.cwd(), "public", "downloads", "Spoofx.rar");

  if (!fs.existsSync(filePath)) {
    return new NextResponse("File not found on server", { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const fileStream = fs.createReadStream(filePath);

  return new NextResponse(fileStream as any, {
    headers: {
      "Content-Type": "application/x-rar-compressed",
      "Content-Disposition": 'attachment; filename="Spoofx.rar"',
      "Content-Length": stat.size.toString(),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
