import { NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { ManualDocument } from "@/components/pdf/ManualDocument";

export async function GET() {
  const element = React.createElement(ManualDocument) as unknown as React.ReactElement<import("@react-pdf/renderer").DocumentProps>;
  const buffer = await renderToBuffer(element);
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Manual-Usuario-Oficina.pdf"`,
    },
  });
}
