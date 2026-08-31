/**
 * Hierarchical RBAC & Department Matrix
 * ──────────────────────────────────────────────────────────────────────
 * Implements hierarchical job roles, departments, and approval limits
 * while maintaining backward compatibility with the 13 core roles.
 */

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface CreateDepartmentParams {
    hotelId: string;
    name: string;
    code: string;
    description?: string;
}

export interface CreateJobRoleParams {
    hotelId: string;
    departmentId: string;
    title: string;
    code: string;
    baseRole?: string;
    approvalLimit?: Prisma.Decimal | number | string;
    description?: string;
}

export async function createDepartment(params: CreateDepartmentParams) {
    const { hotelId, name, code, description } = params;

    return prisma.department.create({
        data: {
            hotelId,
            name,
            code: code.toUpperCase(),
            description: description ?? null,
        },
    });
}

export async function createJobRole(params: CreateJobRoleParams) {
    const { hotelId, departmentId, title, code, baseRole = "STAFF", approvalLimit = 0, description } = params;

    return prisma.jobRole.create({
        data: {
            hotelId,
            departmentId,
            title,
            code: code.toUpperCase(),
            baseRole,
            approvalLimit: new Prisma.Decimal(approvalLimit.toString()),
            description: description ?? null,
        },
    });
}

export async function assignUserJobRole(params: { userId: string; jobRoleId: string; hotelId: string }) {
    const { userId, jobRoleId, hotelId } = params;

    return prisma.userRoleAssignment.upsert({
        where: {
            userId_jobRoleId_hotelId: {
                userId,
                jobRoleId,
                hotelId,
            },
        },
        update: {},
        create: {
            userId,
            jobRoleId,
            hotelId,
        },
    });
}

export async function getUserEffectiveApprovalLimit(userId: string, hotelId: string): Promise<Prisma.Decimal> {
    const assignments = await prisma.userRoleAssignment.findMany({
        where: { userId, hotelId },
        include: { jobRole: true },
    });

    if (assignments.length === 0) {
        return new Prisma.Decimal(0);
    }

    let maxLimit = new Prisma.Decimal(0);
    for (const a of assignments) {
        if (a.jobRole.approvalLimit.gt(maxLimit)) {
            maxLimit = a.jobRole.approvalLimit;
        }
    }

    return maxLimit;
}
