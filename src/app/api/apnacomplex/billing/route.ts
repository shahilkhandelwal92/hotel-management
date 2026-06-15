import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const tokenSecret = process.env.APNACOMPLEX_JWT_SECRET || process.env.APNACOMPLEX_API_KEY;
        if (!tokenSecret || tokenSecret.length < 32) {
            return NextResponse.json(
                { error: 'Apnacomplex integration is not configured' },
                { status: 503 },
            );
        }

        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token) {
            return NextResponse.json(
                { error: 'Unauthorized: Invalid or missing Bearer token' },
                { status: 401 },
            );
        }

        const { payload } = await jwtVerify(
            token,
            new TextEncoder().encode(tokenSecret),
            {
                algorithms: ['HS256'],
                issuer: 'hotel-management',
                audience: 'apnacomplex',
            },
        );

        if (typeof payload.hotelId !== 'string' || !payload.hotelId) {
            return NextResponse.json({ error: 'Unauthorized token scope' }, { status: 401 });
        }

        const body = await request.json();
        const { societyId, unitId, amount, description } = body;
        const numericAmount = Number(amount);

        if (
            typeof societyId !== 'string' ||
            typeof unitId !== 'string' ||
            !Number.isFinite(numericAmount) ||
            numericAmount <= 0
        ) {
            return NextResponse.json(
                { error: 'Bad Request: Invalid Apnacomplex billing fields' },
                { status: 400 },
            );
        }

        return NextResponse.json({
            success: true,
            hotelId: payload.hotelId,
            transactionId: crypto.randomUUID(),
            syncedAt: new Date().toISOString(),
            amount: numericAmount,
            description: typeof description === 'string' ? description : null,
        });
    } catch {
        return NextResponse.json(
            { error: 'Unauthorized: Invalid or expired Bearer token' },
            { status: 401 },
        );
    }
}
