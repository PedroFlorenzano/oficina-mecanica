import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createContainer } from "@/infrastructure/container";
import { handleError } from "@/lib/api-handler";

// GET /api/appointments — list all
export async function GET() {
  try {
    const session = await requireAuth();
    const container = createContainer(session.user.tenantId);
    const appointments = await container.appointmentRepository.findAll(session.user.tenantId);
    return NextResponse.json(appointments);
  } catch (error) {
    return handleError(error);
  }
}
