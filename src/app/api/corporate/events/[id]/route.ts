import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPortalToken } from "@/lib/portalAuth";

type Params = Promise<{ id: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
    const { id } = await params;
    const cookieStore = await cookies();
    const portalSession = await verifyPortalToken(
        cookieStore.get("corporate_session")?.value,
        "corporate",
    );

    if (!portalSession || portalSession.subjectId !== id) {
        return NextResponse.json({ error: "Unauthorized corporate session" }, { status: 401 });
    }

    const event = await prisma.corporateEvent.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            corporateName: true,
            date: true,
            expectedCount: true,
            guests: {
                select: {
                    id: true,
                    name: true,
                    status: true,
                    attendanceTime: true,
                },
                orderBy: { name: "asc" },
            },
        },
    });

    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    return NextResponse.json({ event });
}
