import { SignJWT } from 'jose';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const apiKey = process.env.APNACOMPLEX_API_KEY;
        const tokenSecret = process.env.APNACOMPLEX_JWT_SECRET || apiKey;

        if (!apiKey || !tokenSecret || tokenSecret.length < 32) {
            return NextResponse.json(
                { error: 'Apnacomplex integration is not configured' },
                { status: 503 },
            );
        }

        const body = await request.json();
        const { apiKey: suppliedApiKey, hotelId } = body;

        if (typeof suppliedApiKey !== 'string' || suppliedApiKey !== apiKey) {
            return NextResponse.json(
                { error: 'Unauthorized: Invalid or missing API Key' },
                { status: 401 },
            );
        }

        if (typeof hotelId !== 'string' || !hotelId) {
            return NextResponse.json(
                { error: 'Bad Request: hotelId is required' },
                { status: 400 },
            );
        }

        const token = await new SignJWT({ hotelId })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuer('hotel-management')
            .setAudience('apnacomplex')
            .setIssuedAt()
            .setExpirationTime('1h')
            .sign(new TextEncoder().encode(tokenSecret));

        return NextResponse.json({
            success: true,
            token,
            expiresIn: 3600,
        });
    } catch {
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 },
        );
    }
}
