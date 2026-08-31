/**
 * Real Database Test Environment Helper
 * ─────────────────────────────────────────────────────────────
 * Provides database connection validation, deterministic test tenant isolation,
 * test fixtures, cleanup routines, and transaction harnesses.
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface TestHotelContext {
    hotelId: string;
    hotelName: string;
    timezone: string;
    userId: string;
    roomId: string;
}

/**
 * Creates an isolated test hotel with standard room, rate plan, and test user.
 */
export async function setupTestHotel(suffix: string = `${Date.now()}`): Promise<TestHotelContext> {
    const hotel = await prisma.hotel.create({
        data: {
            name: `Test Hotel ${suffix}`,
            location: `Test City ${suffix}`,
            timezone: "Asia/Kolkata",
            latitude: 28.6139,
            longitude: 77.2090,
            geofenceRadius: 200,
            status: "Active",
        },
    });

    const user = await prisma.user.create({
        data: {
            name: `Test Admin ${suffix}`,
            email: `testadmin_${suffix}@stayos.test`,
            password: "hashed_test_password_123",
            hotelId: hotel.id,
        },
    });

    const room = await prisma.room.create({
        data: {
            hotelId: hotel.id,
            number: `R-${suffix.slice(-4)}`,
            type: "Deluxe",
            price: new Prisma.Decimal("3500.00"),
            status: "Vacant",
            floor: 1,
        },
    });

    return {
        hotelId: hotel.id,
        hotelName: hotel.name,
        timezone: hotel.timezone,
        userId: user.id,
        roomId: room.id,
    };
}

/**
 * Completely cleans up all test resources created under a test hotel.
 */
export async function teardownTestHotel(hotelId: string): Promise<void> {
    try {
        await prisma.roomBlock.deleteMany({ where: { hotelId } });
        await prisma.folioTransaction.deleteMany({ where: { folio: { reservation: { hotelId } } } });
        await prisma.folio.deleteMany({ where: { reservation: { hotelId } } });
        await prisma.payment.deleteMany({ where: { hotelId } });
        await prisma.invoiceItem.deleteMany({ where: { invoice: { hotelId } } });
        await prisma.invoice.deleteMany({ where: { hotelId } });
        await prisma.reservation.deleteMany({ where: { hotelId } });
        await prisma.housekeepingTask.deleteMany({ where: { hotelId } });
        await prisma.room.deleteMany({ where: { hotelId } });
        await prisma.userRole.deleteMany({ where: { hotelId } });
        await prisma.user.deleteMany({ where: { hotelId } });
        await prisma.hotel.delete({ where: { id: hotelId } });
    } catch (error) {
        console.warn(`[teardownTestHotel] Warning during cleanup of ${hotelId}:`, error);
    }
}
