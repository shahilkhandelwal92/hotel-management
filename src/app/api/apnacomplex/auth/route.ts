import { NextResponse } from 'next/server';

const VALID_API_KEYS = {
    APNACOMPLEX_DEMO_KEY: 'apnacomplex-integration',
};

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { apiKey, hotelId } = body;

        if (!apiKey || apiKey !== VALID_API_KEYS.APNACOMPLEX_DEMO_KEY) {
            return NextResponse.json(
                { error: 'Unauthorized: Invalid or missing API Key' },
                { status: 401 }
            );
        }

        if (!hotelId) {
            return NextResponse.json(
                { error: 'Bad Request: hotelId is required' },
                { status: 400 }
            );
        }

        // Generate a temporary access token for the session (Simulated)
        const token = `thm_${Math.random().toString(36).substring(2, 15)}`;

        return NextResponse.json({
            success: true,
            token,
            expiresIn: 3600, // 1 hour
            message: 'Authentication successful. Use this token for subsequent API calls.'
        });

    } catch (error) {
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
