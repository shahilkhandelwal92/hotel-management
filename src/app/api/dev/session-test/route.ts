import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
    try {
        const session = await getSession();
        return NextResponse.json({
            success: true,
            hasSession: !!session,
            sessionData: session || null
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
