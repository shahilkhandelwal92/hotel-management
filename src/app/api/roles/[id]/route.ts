import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hasAnyRole } from "@/lib/auth";

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!hasAnyRole(session, ["SUPER_ADMIN", "OWNER"])) {
            return NextResponse.json({ error: "Super Admin access required" }, { status: 403 });
        }

        const { id } = await context.params;
        const { name, permissionIds } = await req.json();
        const existingRole = await prisma.role.findUnique({ where: { id } });
        if (!existingRole) return NextResponse.json({ error: "Role not found" }, { status: 404 });
        if (["SUPER_ADMIN", "OWNER"].includes(existingRole.name)) {
            return NextResponse.json({ error: "Protected system roles cannot be modified" }, { status: 422 });
        }

        // Reset permissions first
        if (permissionIds) {
            await prisma.rolePermission.deleteMany({
                where: { roleId: id }
            });
        }

        const updatedRole = await prisma.role.update({
            where: { id },
            data: {
                name: name || undefined,
                ...(permissionIds && {
                    permissions: {
                        create: permissionIds.map((pid: string) => ({
                            permission: { connect: { id: pid } }
                        }))
                    }
                })
            },
            include: {
                permissions: { include: { permission: true } }
            }
        });

        return NextResponse.json(updatedRole);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!hasAnyRole(session, ["SUPER_ADMIN", "OWNER"])) {
            return NextResponse.json({ error: "Super Admin access required" }, { status: 403 });
        }

        const { id } = await context.params;
        const role = await prisma.role.findUnique({ where: { id } });
        if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
        if (["SUPER_ADMIN", "OWNER"].includes(role.name)) {
            return NextResponse.json({ error: "Protected system roles cannot be deleted" }, { status: 422 });
        }
        await prisma.role.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
