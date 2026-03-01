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

        const superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
        const ownerRole = await prisma.role.findUnique({ where: { name: 'OWNER' } });

        // Create a global Project Owner user
        if (ownerRole) {
            const passwordHash = await hashPassword('password123');
            const owner = await prisma.user.upsert({
                where: { email: 'owner@grandimperial.com' },
                update: {},
                create: {
                    name: 'Project Owner',
                    email: 'owner@grandimperial.com',
                    password: passwordHash,
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
                update: {},
                create: {
                    name: 'Hotel Manager',
                    email: 'admin@grandimperial.com',
                    password: passwordHash,
                }
            });

            // Assign role
            await prisma.userRole.upsert({
                where: { userId_roleId: { userId: superAdmin.id, roleId: superAdminRole.id } },
                update: {},
                create: { userId: superAdmin.id, roleId: superAdminRole.id }
            });
        }

        return NextResponse.json({ success: true, message: 'Database seeded with core roles and users' });
    } catch (error) {
        console.error("Seed error:", error);
        return NextResponse.json({ error: 'Failed to seed DB' }, { status: 500 });
    }
}
