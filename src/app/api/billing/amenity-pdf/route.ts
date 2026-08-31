import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import PdfPrinter from "pdfmake";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const user = await getSession();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { bookingId } = body;

        if (!bookingId) {
            return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
        }

        // Fetch AmenityBooking along with the related Amenity and Hotel config
        const booking: any = await (prisma as any).amenityBooking.findUnique({
            where: { id: bookingId },
            include: {
                amenity: true,
                hotel: true
            }
        });

        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        const hotel = booking.hotel;

        // Determine Financial Year roughly
        const now = new Date();
        const currentYear = now.getFullYear();
        const startYear = now.getMonth() < 3 ? currentYear - 1 : currentYear;
        const financialYear = `${startYear}-${startYear + 1}`;

        const taxConfig: any = await (prisma as any).taxConfiguration.findUnique({
            where: {
                hotelId_financialYear: {
                    hotelId: hotel.id,
                    financialYear
                }
            }
        });

        // 1. Calculations
        const baseAmount = booking.totalAmount;
        let cgst = 0, sgst = 0, igst = 0;

        // Default walk-in to Same State as company for simplicities sake if standard guest params are missing.
        const isSameState = true;

        if (taxConfig && taxConfig.isTaxApplicable && booking.amenity.isTaxApplicable && booking.amenity.pricingType !== "FREE") {
            const taxPct = taxConfig.amenityTaxPct || 0;
            const totalTax = (baseAmount * taxPct) / 100;

            if (isSameState) {
                cgst = totalTax / 2;
                sgst = totalTax / 2;
            } else {
                igst = totalTax;
            }
        }

        const grandTotal = baseAmount + cgst + sgst + igst;

        // 2. Prepare Dynamic PDF Make Doc Definition
        const docDefinition: any = {
            defaultStyle: { font: 'Helvetica' },
            content: [
                { text: `AMENITY INVOICE`, style: 'header' },
                { text: hotel.name, style: 'subheader' },
                { text: `Address: ${hotel.location}` },
                { text: `GSTIN: ${taxConfig?.taxRegistrationNumber || "N/A"}` },
                { text: '\n' },
                {
                    columns: [
                        { text: `Billed To:\n${booking.guestName}\nContact: ${booking.guestContact}\nWalk-in Customer` },
                        { text: `Date: ${new Date().toLocaleDateString()}\nInvoice #: ${booking.invoiceToken.substring(0, 8).toUpperCase()}`, alignment: 'right' }
                    ]
                },
                { text: '\n\n' },
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', 'auto'],
                        body: [
                            [{ text: 'Description', bold: true }, { text: 'Amount (INR)', bold: true }],
                            [`Booking: ${booking.amenity.name}`, baseAmount.toFixed(2)],
                            ['Subtotal', baseAmount.toFixed(2)],
                        ]
                    }
                },
                { text: '\n' }
            ]
        };

        if (taxConfig && taxConfig.isTaxApplicable && booking.amenity.isTaxApplicable) {
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

        // 3. Generate PDF
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
                baseAmount,
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
