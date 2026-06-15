import { PrismaClient } from '@prisma/client';
import type { Permission, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

async function main() {
    console.log('🚀 Seeding Client Logins...');

    // 1. Ensure Demo Hotel exists
    const hotel = await prisma.hotel.upsert({
        where: { id: 'demo-property-id' },
        update: {},
        create: {
            id: 'demo-property-id',
            name: 'Demo Grand Hotel',
            location: 'Mumbai, Maharashtra',
            address: '456 Business Bay, Nariman Point',
            phone: '022-12345678',
            email: 'demo@hotel.com',
            status: 'Active',
            roomCount: 50,
        },
    });
    console.log(`🏨 Hotel: ${hotel.name} (${hotel.id})`);

    // 2. Define Permissions
    const permissionNames = [
        'MANAGE_BOOKINGS',
        'MANAGE_INVENTORY',
        'MANAGE_HOUSEKEEPING',
        'MANAGE_EVENTS',
        'VIEW_FINANCIALS',
        'MANAGE_SETTINGS',
        'MANAGE_POS',
        'MANAGE_HR',
        'MANAGE_GUESTS',
        'MANAGE_STAFF',
    ];

    const permissions: Record<string, Permission> = {};
    for (const name of permissionNames) {
        permissions[name] = await prisma.permission.upsert({
            where: { name },
            update: {},
            create: { name, description: `Can ${name.toLowerCase().replace('_', ' ')}` },
        });
        console.log(`🛡️ Permission created: ${name}`);
    }

    // 3. Define Roles
    const roleNames = [
        'SUPER_ADMIN',
        'OWNER',
        'HOTEL_ADMIN',
        'FRONT_DESK',
        'STAFF',
        'HOUSEKEEPING',
        'KITCHEN',
        'RESTAURANT',
        'HR',
        'CORPORATE',
        'ACCOUNTING',
        'GUEST',
    ];

    const rolePermissions: Record<string, string[]> = {
        SUPER_ADMIN: permissionNames,
        OWNER: permissionNames,
        HOTEL_ADMIN: [
            'MANAGE_BOOKINGS',
            'MANAGE_INVENTORY',
            'MANAGE_HOUSEKEEPING',
            'MANAGE_EVENTS',
            'MANAGE_SETTINGS',
            'MANAGE_POS',
            'MANAGE_HR',
            'MANAGE_GUESTS',
            'MANAGE_STAFF',
        ],
        FRONT_DESK: ['MANAGE_BOOKINGS', 'MANAGE_GUESTS', 'MANAGE_HOUSEKEEPING'],
        STAFF: ['MANAGE_BOOKINGS', 'MANAGE_GUESTS', 'MANAGE_HOUSEKEEPING'],
        HOUSEKEEPING: ['MANAGE_HOUSEKEEPING'],
        KITCHEN: ['MANAGE_POS'],
        RESTAURANT: ['MANAGE_POS'],
        HR: ['MANAGE_HR', 'MANAGE_STAFF'],
        CORPORATE: ['MANAGE_EVENTS'],
        ACCOUNTING: ['VIEW_FINANCIALS', 'MANAGE_HR'],
        GUEST: [],
    };

    const roles: Record<string, Role> = {};
    for (const name of roleNames) {
        roles[name] = await prisma.role.upsert({
            where: { name },
            update: {},
            create: { name },
        });

        await prisma.rolePermission.deleteMany({ where: { roleId: roles[name].id } });
        for (const permissionName of rolePermissions[name]) {
            await prisma.rolePermission.create({
                data: {
                    roleId: roles[name].id,
                    permissionId: permissions[permissionName].id,
                },
            });
        }

        console.log(`🎭 Role created/updated: ${name}`);
    }

    // 4. Define Users
    const commonPassword = await hashPassword('Client@2026');
    const userData = [
        {
            name: 'Master Client Admin',
            email: 'client.admin@demo.com',
            roles: ['SUPER_ADMIN'],
        },
        {
            name: 'Hotel Manager',
            email: 'hotel.admin@demo.com',
            roles: ['HOTEL_ADMIN'],
        },
        {
            name: 'Front Desk Staff',
            email: 'staff@demo.com',
            roles: ['STAFF'],
        },
        {
            name: 'Head Chef',
            email: 'kitchen@demo.com',
            roles: ['KITCHEN'],
        },
        {
            name: 'Corporate Partner',
            email: 'corporate@demo.com',
            roles: ['CORPORATE'],
        },
        {
            name: 'Head Accountant',
            email: 'accounting@demo.com',
            roles: ['ACCOUNTING'],
        },
        {
            name: 'Guest User',
            email: 'guest@demo.com',
            roles: ['GUEST'],
        },
    ];

    for (const data of userData) {
        const user = await prisma.user.upsert({
            where: { email: data.email },
            update: {
                name: data.name,
                password: commonPassword,
                hotelId: hotel.id,
            },
            create: {
                name: data.name,
                email: data.email,
                password: commonPassword,
                hotelId: hotel.id,
            },
        });

        // Assign Roles
        // First delete existing roles for clean seed
        await prisma.userRole.deleteMany({ where: { userId: user.id } });

        for (const roleName of data.roles) {
            await prisma.userRole.create({
                data: {
                    userId: user.id,
                    roleId: roles[roleName].id,
                    hotelId: roleName === 'SUPER_ADMIN' || roleName === 'OWNER' ? null : hotel.id,
                },
            });
        }
        console.log(`👤 User created: ${data.name} (${data.email})`);
    }

    // 5. Deterministic checked-in stay for guest journey testing.
    const room = await prisma.room.upsert({
        where: { id: 'demo-room-101' },
        update: {
            hotelId: hotel.id,
            number: '101',
            type: 'Premium King',
            floor: 1,
            maxOccupancy: 3,
            price: 5200,
            status: 'Occupied',
            includesBreakfast: true,
        },
        create: {
            id: 'demo-room-101',
            hotelId: hotel.id,
            number: '101',
            type: 'Premium King',
            floor: 1,
            maxOccupancy: 3,
            price: 5200,
            status: 'Occupied',
            includesBreakfast: true,
        },
    });

    const menuItems = [
        { id: 'demo-menu-dosa', name: 'Masala Dosa', category: 'Breakfast', price: 280, isVeg: true, spiceLevel: 'Medium' },
        { id: 'demo-menu-paneer', name: 'Paneer Tikka Bowl', category: 'Main Course', price: 420, isVeg: true, spiceLevel: 'Medium' },
        { id: 'demo-menu-coffee', name: 'Cold Coffee', category: 'Beverages', price: 190, isVeg: true, spiceLevel: 'Low' },
    ];
    for (const item of menuItems) {
        await prisma.menuItem.upsert({
            where: { id: item.id },
            update: { ...item, hotelId: hotel.id },
            create: { ...item, hotelId: hotel.id },
        });
    }

    const amenities = [
        { id: 'demo-amenity-spa', name: 'Signature Spa', price: 900, pricingType: 'CHARGEABLE', isTaxApplicable: true },
        { id: 'demo-amenity-gym', name: 'Fitness Studio', price: 0, pricingType: 'FREE', isTaxApplicable: false },
    ];
    for (const amenity of amenities) {
        await prisma.amenity.upsert({
            where: { id: amenity.id },
            update: { ...amenity, hotelId: hotel.id },
            create: { ...amenity, hotelId: hotel.id },
        });
    }

    const reservationId = 'demo-stay-reservation';
    await prisma.posOrderItem.deleteMany({ where: { order: { reservationId } } });
    await prisma.posOrder.deleteMany({ where: { reservationId } });
    await prisma.amenityBooking.deleteMany({ where: { reservationId } });
    await prisma.guestRequest.deleteMany({ where: { reservationId } });
    await prisma.folioTransaction.deleteMany({ where: { folio: { reservationId } } });
    await prisma.folio.deleteMany({ where: { reservationId } });

    const now = new Date();
    const checkIn = new Date(now);
    checkIn.setDate(checkIn.getDate() - 1);
    const checkOut = new Date(now);
    checkOut.setDate(checkOut.getDate() + 2);
    await prisma.reservation.upsert({
        where: { id: reservationId },
        update: {
            bookingRef: 'DEMO-STAY-2026',
            hotelId: hotel.id,
            roomId: room.id,
            guestName: 'Demo Guest',
            guestEmail: 'guest@demo.com',
            guestPhone: '9999999999',
            guestState: 'Maharashtra',
            checkIn,
            checkOut,
            actualCheckIn: now,
            actualCheckOut: null,
            selfCheckInAt: now,
            selfCheckOutAt: null,
            baseAmount: 5200,
            taxAmount: 624,
            totalAmount: 5824,
            advanceDeposit: 4624,
            balanceDue: 1200,
            status: 'CheckedIn',
            deletedAt: null,
        },
        create: {
            id: reservationId,
            bookingRef: 'DEMO-STAY-2026',
            hotelId: hotel.id,
            roomId: room.id,
            guestName: 'Demo Guest',
            guestEmail: 'guest@demo.com',
            guestPhone: '9999999999',
            guestState: 'Maharashtra',
            checkIn,
            checkOut,
            actualCheckIn: now,
            selfCheckInAt: now,
            baseAmount: 5200,
            taxAmount: 624,
            totalAmount: 5824,
            advanceDeposit: 4624,
            balanceDue: 1200,
            includesBreakfast: true,
            status: 'CheckedIn',
        },
    });

    await prisma.folio.create({
        data: {
            id: 'demo-stay-folio',
            hotelId: hotel.id,
            reservationId,
            folioType: 'Room',
            balance: 1200,
            status: 'Open',
            transactions: {
                create: {
                    type: 'Opening',
                    description: 'Opening room balance',
                    amount: 1200,
                },
            },
        },
    });
    console.log('🧳 Demo stay ready: DEMO-STAY-2026');

    console.log('\n✅ Client Logins Seeded Successfully!');
    console.log('--------------------------------------------------');
    console.log('Master Login: client.admin@demo.com / Client@2026');
    console.log('Role Logins: [role]@demo.com / Client@2026');
    console.log('--------------------------------------------------');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
