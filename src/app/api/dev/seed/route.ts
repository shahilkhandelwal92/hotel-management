import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hasAnyRole, hashPassword } from '@/lib/auth';

export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const session = await getSession();
    if (!hasAnyRole(session, ['SUPER_ADMIN', 'OWNER'])) {
        return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
    }

    try {
        // Create initial roles
        const roles = ['OWNER', 'SUPER_ADMIN', 'HOTEL_ADMIN', 'STAFF', 'KITCHEN', 'CORPORATE', 'ACCOUNTING'];
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
            const passwordHash = await hashPassword(process.env.DEMO_ACCOUNT_PASSWORD || 'Client@2026');
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
            const existingOwnerRole = await prisma.userRole.findFirst({
                where: { userId: owner.id, roleId: ownerRole.id, hotelId: null },
            });
            if (!existingOwnerRole) {
                await prisma.userRole.create({
                    data: { userId: owner.id, roleId: ownerRole.id },
                });
            }
        }

        // Create Hotel Super Admin user
        if (superAdminRole) {
            const passwordHash = await hashPassword(process.env.DEMO_ACCOUNT_PASSWORD || 'Client@2026');
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
            const existingSuperAdminRole = await prisma.userRole.findFirst({
                where: { userId: superAdmin.id, roleId: superAdminRole.id, hotelId: null },
            });
            if (!existingSuperAdminRole) {
                await prisma.userRole.create({
                    data: { userId: superAdmin.id, roleId: superAdminRole.id },
                });
            }
        }

        // 1. Rooms
        const roomData = [
            { id: 'room_101', number: '101', type: 'Deluxe Room', price: 4500, includesBreakfast: true },
            { id: 'room_102', number: '102', type: 'Executive Suite', price: 8500, includesBreakfast: true, includesDinner: true },
            { id: 'room_201', number: '201', type: 'Standard Room', price: 3000 },
        ];
        for (const r of roomData) {
            await prisma.room.upsert({
                where: { id: r.id },
                update: { hotelId: hotel.id },
                create: { ...r, hotelId: hotel.id }
            });
        }

        // 2. Amenities
        const amenityData = [
            { id: 'am_spa', name: 'Spa Session (60 mins)', price: 2500 },
            { id: 'am_bed', name: 'Extra Bed', price: 1000 },
            { id: 'am_gym', name: 'Gym Access (Day)', price: 500 },
        ];
        for (const a of amenityData) {
            await prisma.amenity.upsert({
                where: { id: a.id },
                update: { hotelId: hotel.id },
                create: { ...a, hotelId: hotel.id }
            });
        }

        // 3. Menu Items
        const menuData = [
            { id: 'menu_1', name: 'Paneer Butter Masala', category: 'Main Course', price: 350, isVeg: true, spiceLevel: 'Medium' },
            { id: 'menu_2', name: 'Butter Chicken', category: 'Main Course', price: 450, isVeg: false, spiceLevel: 'Medium' },
            { id: 'menu_3', name: 'Vegetable Biryani', category: 'Rice', price: 300, isVeg: true, spiceLevel: 'High' },
        ];
        for (const m of menuData) {
            await prisma.menuItem.upsert({
                where: { id: m.id },
                update: { hotelId: hotel.id },
                create: { ...m, hotelId: hotel.id }
            });
        }

        // 4. Sample Corporate Event
        await prisma.corporateEvent.upsert({
            where: { id: 'evt_demo' },
            update: { hotelId: hotel.id },
            create: {
                id: 'evt_demo',
                name: 'Tech Innovators Summit 2026',
                corporateName: 'TechCorp Global',
                date: new Date('2026-06-15'),
                expectedCount: 150,
                accessCode: 'TECH2026',
                hotelId: hotel.id
            }
        });

        await prisma.leaveType.upsert({
            where: { id: 'lt_sick' },
            update: { hotelId: hotel.id },
            create: {
                id: 'lt_sick',
                name: 'Sick Leave',
                defaultDays: 12,
                hotelId: hotel.id
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Database seeded with Hotel, Roles, Users, Rooms, Amenities, Menu, and a Sample Event (Access Code: TECH2026)'
        });
    } catch (error) {
        console.error("Seed error:", error);
        return NextResponse.json({ error: 'Failed to seed DB' }, { status: 500 });
    }
}
