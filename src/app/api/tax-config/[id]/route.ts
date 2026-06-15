import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Params = Promise<{ id: string }>;

// Middleware equivalent to verify access
async function verifyAccountingAccess() {
    const user = await getSession();
    if (!user) {
        return { error: "Unauthorized", status: 401 };
    }

    const isAccountingOrSuperAdmin = user.roles?.some((r: any) =>
        r.role.name === "SUPER_ADMIN" || r.role.name === "ACCOUNTING"
    );

    if (!isAccountingOrSuperAdmin) {
        return { error: "Forbidden: Requires Accounting Privileges", status: 403 };
    }

    return { user: user as any };
}

// PUT /api/tax-config/[id]
export async function PUT(req: Request, { params }: { params: Params }) {
    try {
        const { id } = await params;
        const access = await verifyAccountingAccess();
        if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });

        const body = await req.json();

        // Verify ownership/hotel mapping here if it was strictly needed
        // but since SUPER_ADMIN & ACCOUNTING are the ones accessing, we trust the ID

        const config = await (prisma as any).taxConfiguration.update({
            where: { id },
            data: body
        });

        return NextResponse.json(config);
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: "Tax configuration not found" }, { status: 404 });
        }
        if (error.code === 'P2002') {
            return NextResponse.json({ error: "A configuration for this financial year already exists for this hotel." }, { status: 409 });
        }
        console.error("Error updating tax configuration:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/tax-config/[id]
export async function DELETE(req: Request, { params }: { params: Params }) {
    try {
        const { id } = await params;
        const access = await verifyAccountingAccess();
        if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });

        await (prisma as any).taxConfiguration.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: "Tax configuration deleted" });
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: "Tax configuration not found" }, { status: 404 });
        }
        console.error("Error deleting tax configuration:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
