import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

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

// GET /api/tax-config
// Fetch configs for a specific hotel
export async function GET(req: Request) {
    try {
        const access = await verifyAccountingAccess();
        if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });

        const { searchParams } = new URL(req.url);
        const hotelId = searchParams.get('hotelId') || access.user.hotelId;
        const financialYear = searchParams.get('financialYear');

        if (!hotelId) {
            return NextResponse.json({ error: "hotelId is required" }, { status: 400 });
        }

        const buildQuery: any = { hotelId };
        if (financialYear) buildQuery.financialYear = financialYear;

        const configs = await (prisma as any).taxConfiguration.findMany({
            where: buildQuery,
            orderBy: { financialYear: 'desc' }
        });

        return NextResponse.json(configs);
    } catch (error) {
        console.error("Error fetching tax configurations:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST /api/tax-config
export async function POST(req: Request) {
    try {
        const access = await verifyAccountingAccess();
        if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });

        const body = await req.json();
        const hotelId = body.hotelId || access.user.hotelId;

        if (!hotelId || !body.financialYear) {
            return NextResponse.json({ error: "hotelId and financialYear are required" }, { status: 400 });
        }

        const config = await (prisma as any).taxConfiguration.create({
            data: {
                ...body,
                hotelId
            }
        });

        return NextResponse.json(config, { status: 201 });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: "A configuration for this financial year already exists for this hotel." }, { status: 409 });
        }
        console.error("Error creating tax configuration:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
