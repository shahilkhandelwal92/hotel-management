import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET() {
    try {
        // Create initial roles
        const roles = ['OWNER', 'SUPER_ADMIN', 'HOTEL_ADMIN', 'STAFF', 'KITCHEN', 'CORPORATE'];
        for (const roleName of roles) {
            await prisma.role.upsert({
                where: { name: roleName },
                update: {},
                create: { name: roleName }
            });
        }

        // Create default hotel
        const hotel = await prisma.hotel.upsert({
            where: { id: 'hotel_1' },
            update: {},
            create: {
                id: 'hotel_1',
                name: 'The Grand Imperial',
                location: 'Mumbai, India',
                roomCount: 50,
                status: 'Active',
                hasInHouseRestaurant: true,
            }
        });

        const superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
        const ownerRole = await prisma.role.findUnique({ where: { name: 'OWNER' } });

        // Create a global Project Owner user
        if (ownerRole) {
            const passwordHash = await hashPassword('password123');
            const owner = await prisma.user.upsert({
                where: { email: 'owner@grandimperial.com' },
                update: {
                    hotelId: hotel.id
                },
                create: {
                    name: 'Project Owner',
                    email: 'owner@grandimperial.com',
                    password: passwordHash,
                    hotelId: hotel.id
                }
            });

            // Assign role
            await prisma.userRole.upsert({
                where: { userId_roleId: { userId: owner.id, roleId: ownerRole.id } },
                update: {},
                create: { userId: owner.id, roleId: ownerRole.id }
            });
        }

        // Create Hotel Super Admin user
        if (superAdminRole) {
            const passwordHash = await hashPassword('password123');
            const superAdmin = await prisma.user.upsert({
                where: { email: 'admin@grandimperial.com' },
                update: {
                    hotelId: hotel.id
                },
                create: {
                    name: 'Hotel Manager',
                    email: 'admin@grandimperial.com',
                    password: passwordHash,
                    hotelId: hotel.id
                }
            });

            // Assign role
            await prisma.userRole.upsert({
                where: { userId_roleId: { userId: superAdmin.id, roleId: superAdminRole.id } },
                update: {},
                create: { userId: superAdmin.id, roleId: superAdminRole.id }
            });
        }

        // Add some default Room/Staff data for demo
        await prisma.room.upsert({
            where: { id: 'room_101' },
            update: {},
            create: {
                id: 'room_101',
                number: '101',
                type: 'Deluxe',
                price: 5500,
                hotelId: hotel.id
            }
        });

        await prisma.leaveType.upsert({
            where: { id: 'lt_sick' },
            update: {},
            create: {
                id: 'lt_sick',
                name: 'Sick Leave',
                defaultDays: 12,
                hotelId: hotel.id
            }
        });

        return NextResponse.json({ success: true, message: 'Database seeded with Hotel, Roles, and Users' });
    } catch (error) {
        console.error("Seed error:", error);
        return NextResponse.json({ error: 'Failed to seed DB' }, { status: 500 });
    }
}
