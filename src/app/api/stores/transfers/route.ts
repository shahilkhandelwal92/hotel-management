import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenantContext";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import {
    createStore,
    createStoreTransferRequisition,
    approveAndIssueStoreTransfer,
    receiveStoreTransfer,
} from "@/lib/storesEngine";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.STORE_VIEW);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    const transfers = await prisma.stockTransfer.findMany({
        where: { hotelId: tenant.hotelId },
        include: { sourceStore: true, destStore: true },
        orderBy: { createdAt: "desc" },
    });

    const stores = await prisma.inventoryStore.findMany({
        where: { hotelId: tenant.hotelId },
        orderBy: { name: "asc" },
    });

    return NextResponse.json({ transfers, stores });
}

export async function POST(req: NextRequest) {
    const auth = await requirePermission(req, PERMISSIONS.STORE_MANAGE);
    if (auth instanceof NextResponse) return auth;

    const tenant = await resolveTenantContext(req);
    if (tenant instanceof NextResponse) return tenant;
    if (!tenant.hotelId) return NextResponse.json({ error: "Hotel context required" }, { status: 400 });

    try {
        const body = await req.json();

        if (body.action === "CREATE_STORE") {
            const store = await createStore({
                hotelId: tenant.hotelId,
                name: body.name,
                code: body.code,
                location: body.location,
            });
            return NextResponse.json({ store }, { status: 201 });
        }

        if (body.action === "ISSUE") {
            const transfer = await approveAndIssueStoreTransfer({
                hotelId: tenant.hotelId,
                transferId: body.transferId,
                issuedById: auth.userId,
            });
            return NextResponse.json({ transfer });
        }

        if (body.action === "RECEIVE") {
            const transfer = await receiveStoreTransfer({
                hotelId: tenant.hotelId,
                transferId: body.transferId,
                receivedById: auth.userId,
            });
            return NextResponse.json({ transfer });
        }

        const transfer = await createStoreTransferRequisition({
            hotelId: tenant.hotelId,
            transferNumber: body.transferNumber,
            sourceStoreId: body.sourceStoreId,
            destStoreId: body.destStoreId,
            requestedById: auth.userId,
            itemName: body.itemName,
            quantity: body.quantity,
            unit: body.unit,
        });

        return NextResponse.json({ transfer }, { status: 201 });
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Store transfer operation failed" },
            { status: 500 }
        );
    }
}
