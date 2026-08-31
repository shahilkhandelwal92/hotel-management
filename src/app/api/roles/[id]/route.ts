import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hasAnyRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!session || !hasAnyRole(session, ["SUPER_ADMIN", "OWNER"])) {
            return NextResponse.json({ error: "Super Admin access required" }, { status: 403 });
        }

        const { id } = await context.params;
        const { name, permissionIds } = await req.json();
        const existingRole = await prisma.role.findUnique({ where: { id } });
        if (!existingRole) return NextResponse.json({ error: "Role not found" }, { status: 404 });
        if (["SUPER_ADMIN", "OWNER"].includes(existingRole.name)) {
            return NextResponse.json({ error: "Protected system roles cannot be modified" }, { status: 422 });
        }

        const updatedRole = await prisma.$transaction(async (tx) => {
            if (permissionIds) {
                await tx.rolePermission.deleteMany({ where: { roleId: id } });
            }

            return tx.role.update({
                where: { id },
                data: {
                    name: name ? name.trim() : undefined,
                    ...(permissionIds && {
                        permissions: {
                            create: permissionIds.map((pid: string) => ({
                                permission: { connect: { id: pid } },
                            })),
                        },
                    }),
                },
                include: {
                    permissions: { include: { permission: true } },
                },
            });
        });

        await logAudit({
            userId: session.id,
            module: "Auth",
            action: "UPDATE",
            entityId: id,
            oldValue: { name: existingRole.name },
            newValue: { name: updatedRole.name },
            req,
        });

        return NextResponse.json(updatedRole);
    } catch (err: any) {
        console.error("PUT /api/roles/[id] error:", err);
        return NextResponse.json({ error: err.message || "Failed to update role" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!session || !hasAnyRole(session, ["SUPER_ADMIN", "OWNER"])) {
            return NextResponse.json({ error: "Super Admin access required" }, { status: 403 });
        }

        const { id } = await context.params;
        const role = await prisma.role.findUnique({
            where: { id },
            include: { _count: { select: { users: true } } },
        });
        if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
        if (["SUPER_ADMIN", "OWNER"].includes(role.name)) {
            return NextResponse.json({ error: "Protected system roles cannot be deleted" }, { status: 422 });
        }
        if (role._count.users > 0) {
            return NextResponse.json({ error: "Cannot delete role assigned to active users" }, { status: 422 });
        }

        await prisma.$transaction([
            prisma.rolePermission.deleteMany({ where: { roleId: id } }),
            prisma.role.delete({ where: { id } }),
        ]);

        await logAudit({
            userId: session.id,
            module: "Auth",
            action: "DELETE",
            entityId: id,
            oldValue: { name: role.name },
            req,
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("DELETE /api/roles/[id] error:", err);
        return NextResponse.json({ error: err.message || "Failed to delete role" }, { status: 500 });
    }
}
