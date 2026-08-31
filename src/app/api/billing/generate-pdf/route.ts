import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import PdfPrinter from "pdfmake";
import { getSession } from "@/lib/auth";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
    try {
        const user = await getSession();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { guestId, hotelId } = body;

        if (!guestId || !hotelId) {
            return NextResponse.json({ error: "guestId and hotelId are required" }, { status: 400 });
        }

        // 1. Fetch Guest, Event, Hotel, and Tax Config
        const guest: any = await (prisma as any).corporateGuest.findUnique({
            where: { id: guestId },
            include: {
                event: {
                    include: {
                        hotel: true
                    }
                },
                orders: {
                    include: {
                        items: {
                            include: { menuItem: true }
                        }
                    }
                },
                requests: true
            }
        });

        if (!guest) {
            return NextResponse.json({ error: "Guest not found" }, { status: 404 });
        }

        // Determine current Financial Year (e.g. if today is March 2026 => "2025-2026", if May 2026 => "2026-2027")
        const now = new Date();
        const currentYear = now.getFullYear();
        const startYear = now.getMonth() < 3 ? currentYear - 1 : currentYear;
        const financialYear = `${startYear}-${startYear + 1}`;

        const taxConfig: any = await (prisma as any).taxConfiguration.findUnique({
            where: {
                hotelId_financialYear: {
                    hotelId,
                    financialYear
                }
            }
        });

        const hotel = guest.event.hotel;
        const companyState = taxConfig?.companyState || "Maharashtra"; // Defaulting just in case
        const guestState = guest.state || "Maharashtra";

        const isSameState = companyState.toLowerCase() === guestState.toLowerCase();

        // 2. Base calculations
        let totalFoodAmount = 0;
        guest.orders.forEach((o: any) => { totalFoodAmount += o.totalAmount; });

        let totalAmenitiesAmount = 0;
        guest.requests.forEach((r: any) => {
            if (r.status === 'Approved' || r.status === 'Paid') {
                totalAmenitiesAmount += r.amount;
            }
        });

        const subTotalAmount = totalFoodAmount + totalAmenitiesAmount;
        let cgst = 0, sgst = 0, igst = 0;

        // Apply tax logic according to Indian tax rules
        if (taxConfig && taxConfig.isTaxApplicable) {
            const foodTax = (totalFoodAmount * taxConfig.restaurantTaxPct) / 100;
            const amenitiesTax = (totalAmenitiesAmount * taxConfig.amenityTaxPct) / 100;
            const totalTax = foodTax + amenitiesTax;

            if (isSameState) {
                cgst = totalTax / 2;
                sgst = totalTax / 2;
            } else {
                igst = totalTax;
            }
        }

        const grandTotal = subTotalAmount + cgst + sgst + igst;

        // 3. Prepare Dynamic PDF Make Doc Definition
        // We can hook this up to a JSON string on the `TaxConfiguration` or `Hotel` in the future for per-client dynamic views.
        // For now, this dynamic structure serves as the dynamic template.
        const docDefinition: any = {
            defaultStyle: { font: 'Helvetica' },
            content: [
                { text: `INVOICE`, style: 'header' },
                { text: hotel.name, style: 'subheader' },
                { text: `Address: ${hotel.location}` },
                { text: `GSTIN: ${taxConfig?.taxRegistrationNumber || "N/A"}` },
                { text: '\n' },
                {
                    columns: [
                        { text: `Billed To:\n${guest.name}\n${guestState}, ${guest.country}` },
                        { text: `Date: ${new Date().toLocaleDateString()}`, alignment: 'right' }
                    ]
                },
                { text: '\n\n' },
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', 'auto'],
                        body: [
                            [{ text: 'Description', bold: true }, { text: 'Amount (INR)', bold: true }],
                            ['Food & Beverage', totalFoodAmount.toFixed(2)],
                            ['Amenities / Services', totalAmenitiesAmount.toFixed(2)],
                            ['Subtotal', subTotalAmount.toFixed(2)],
                        ]
                    }
                },
                { text: '\n' }
            ]
        };

        if (taxConfig && taxConfig.isTaxApplicable) {
            if (isSameState) {
                docDefinition.content.push({ text: `CGST: ${cgst.toFixed(2)}`, alignment: 'right' });
                docDefinition.content.push({ text: `SGST: ${sgst.toFixed(2)}`, alignment: 'right' });
            } else {
                docDefinition.content.push({ text: `IGST: ${igst.toFixed(2)}`, alignment: 'right' });
            }
        }

        docDefinition.content.push({ text: `\nGrand Total: INR ${grandTotal.toFixed(2)}`, style: 'total', alignment: 'right' });

        docDefinition.styles = {
            header: { fontSize: 22, bold: true, alignment: 'center', margin: [0, 0, 0, 10] },
            subheader: { fontSize: 16, bold: true, alignment: 'center', margin: [0, 0, 0, 5] },
            total: { fontSize: 14, bold: true }
        };

        // 4. Generate PDF as Base64 string to send to Client
        const fonts = {
            Helvetica: {
                normal: 'Helvetica',
                bold: 'Helvetica-Bold',
                italics: 'Helvetica-Oblique',
                bolditalics: 'Helvetica-BoldOblique'
            }
        };

        const printer = new (PdfPrinter as any)(fonts);
        const pdfDoc = printer.createPdfKitDocument(docDefinition);

        const chunks: any[] = [];
        const promise = new Promise<string>((resolve, reject) => {
            pdfDoc.on('data', (chunk: any) => chunks.push(chunk));
            pdfDoc.on('end', () => {
                const result = Buffer.concat(chunks);
                resolve(result.toString('base64'));
            });
            pdfDoc.on('error', (err: any) => reject(err));
        });

        pdfDoc.end();
        const base64Pdf = await promise;

        return NextResponse.json({
            success: true,
            pdf: base64Pdf,
            breakdown: {
                subTotalAmount,
                cgst,
                sgst,
                igst,
                grandTotal
            }
        });

    } catch (error) {
        console.error("Error generating invoice:", error);
        return NextResponse.json({ error: "Failed to generate invoice" }, { status: 500 });
    }
}
