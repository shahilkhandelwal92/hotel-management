/**
 * Accounts Payable & 3-Way Match Test Suite
 * ──────────────────────────────────────────────────────────────────────
 * Verifies PO creation, Goods Receipt (GRN) verification,
 * 3-Way invoice match validation, and vendor payment settlement.
 */

import {
    createVendor,
    createPurchaseOrder,
    receiveGoodsReceiptNote,
    matchThreeWayAPInvoice,
    recordAPPayment,
} from "@/lib/apEngine";
import prisma from "@/lib/prisma";

jest.setTimeout(30000);

describe("Enterprise Accounts Payable (AP) & 3-Way Match", () => {
    let testHotelId: string;
    let testVendorId: string;
    let testPoId: string;
    let testGrnId: string;
    let testAPInvoiceId: string;

    beforeAll(async () => {
        const hotel = await prisma.hotel.findFirst();
        if (!hotel) throw new Error("No hotel found");
        testHotelId = hotel.id;

        const uniqueCode = `VEND-${Date.now().toString().slice(-4)}`;
        const vendor = await createVendor({
            hotelId: testHotelId,
            vendorCode: uniqueCode,
            vendorName: "Hindustan Unilever Hospitality Supplies",
            category: "TOILETRIES_F&B",
            taxId: "07AAAAA1111A1Z5",
            contactPerson: "Suresh Menon",
            contactEmail: "suresh@hul.com",
            contactPhone: "9876501234",
            paymentTermsDays: 30,
        });
        testVendorId = vendor.id;
    });

    test("executes complete 3-Way Match lifecycle: PO -> GRN -> AP Invoice -> Payment", async () => {
        // 1. Create Purchase Order (PO) for 500 units of Luxury Shampoo at ₹60 = ₹30,000 (+18% GST = ₹35,400)
        const po = await createPurchaseOrder({
            hotelId: testHotelId,
            vendorId: testVendorId,
            poNumber: `PO-${Date.now()}`,
            items: [
                {
                    itemName: "Luxury Shampoo Bottles (100ml)",
                    quantity: 500,
                    unitPrice: 60,
                    taxPercent: 18,
                },
            ],
            createdById: "procurement-officer-1",
            notes: "Monthly guestroom amenities restock",
        });
        testPoId = po.id;

        expect(po.status).toBe("APPROVED");
        expect(po.totalAmount.toNumber()).toBe(35400);

        // 2. Warehouse receives Goods Receipt Note (GRN) for 500 units
        const grn = await receiveGoodsReceiptNote({
            hotelId: testHotelId,
            poId: po.id,
            grnNumber: `GRN-${Date.now()}`,
            deliveryChallanNumber: "DC-998811",
            receivedById: "store-manager-1",
            items: [
                {
                    poItemId: po.items[0].id,
                    itemName: "Luxury Shampoo Bottles (100ml)",
                    quantityReceived: 500,
                    quantityRejected: 0,
                    unitPrice: 60,
                },
            ],
            notes: "Quality inspected and verified intact",
        });
        testGrnId = grn.id;

        expect(grn.status).toBe("RECEIVED");

        // Verify PO item receivedQty updated to 500
        const updatedPO = await prisma.purchaseOrder.findUnique({
            where: { id: po.id },
            include: { items: true },
        });
        expect(updatedPO?.items[0].receivedQty.toNumber()).toBe(500);

        // 3. Finance performs 3-Way Match on vendor invoice (₹35,400)
        const apInvoice = await matchThreeWayAPInvoice({
            hotelId: testHotelId,
            vendorId: testVendorId,
            poId: po.id,
            grnId: grn.id,
            invoiceNumber: `VEND-INV-${Date.now()}`,
            invoiceDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 86400000),
            invoiceAmount: 35400,
        });
        testAPInvoiceId = apInvoice.id;

        expect(apInvoice.threeWayMatched).toBe(true);
        expect(apInvoice.status).toBe("APPROVED");

        // 4. Record vendor payment settlement
        const payment = await recordAPPayment({
            hotelId: testHotelId,
            apInvoiceId: apInvoice.id,
            amount: 35400,
            paymentMethod: "BANK_TRANSFER",
            referenceNumber: "NEFT-HUL-35400",
            paidById: "accountant-1",
        });

        expect(payment.amount.toNumber()).toBe(35400);

        // Verify AP Invoice balance is now 0 and status is PAID
        const updatedAPInv = await prisma.aPInvoice.findUnique({
            where: { id: apInvoice.id },
        });
        expect(updatedAPInv?.status).toBe("PAID");
        expect(updatedAPInv?.balanceAmount.toNumber()).toBe(0);
    });
});
