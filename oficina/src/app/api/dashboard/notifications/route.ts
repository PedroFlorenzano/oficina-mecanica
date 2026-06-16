import { NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { requireAuth } from "@/lib/auth";
import { handleError } from "@/lib/api-handler";

export async function GET() {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);

    const [ordersWaiting, stockAlerts, appointments] = await Promise.all([
      container.orderRepository.findAll(tenantId).then((orders) =>
        orders.filter((o) => o.status === "WAITING_APPROVAL").length
      ),
      container.stockItemRepository.findAll(tenantId).then((items) =>
        items.filter((i) => i.active && i.quantity <= i.minQuantity).length
      ),
      container.appointmentRepository.findAll(tenantId).then((a) =>
        a.filter((ap) => ap.status === "PENDING").length
      ).catch(() => 0),
    ]);

    const notifications = [];
    if (ordersWaiting > 0) notifications.push({ type: "orders", message: `${ordersWaiting} OS aguardando aprovação`, count: ordersWaiting, href: "/dashboard/orders?status=WAITING_APPROVAL" });
    if (stockAlerts > 0) notifications.push({ type: "stock", message: `${stockAlerts} ${stockAlerts === 1 ? "item" : "itens"} abaixo do mínimo`, count: stockAlerts, href: "/dashboard/stock" });
    if (appointments > 0) notifications.push({ type: "appointments", message: `${appointments} ${appointments === 1 ? "agendamento pendente" : "agendamentos pendentes"}`, count: appointments, href: "/dashboard/appointments" });

    return NextResponse.json({ notifications, total: notifications.reduce((s, n) => s + n.count, 0) });
  } catch (error) {
    return handleError(error);
  }
}
