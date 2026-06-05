import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createContainer } from "@/infrastructure/container";
import { handleError } from "@/lib/api-handler";

// PATCH /api/appointments/[id] — update status or notes
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const container = createContainer(session.user.tenantId);
    const body = await request.json();

    if (body.status) {
      const result = await container.appointmentRepository.updateStatus(id, body.status, body.cancelReason);
      return NextResponse.json(result);
    }

    if (body.notes !== undefined) {
      const result = await container.appointmentRepository.updateNotes(id, body.notes);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Nenhuma ação especificada" }, { status: 400 });
  } catch (error) {
    return handleError(error);
  }
}
