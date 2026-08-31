// Unit testing running guest folio ledger operations

type FolioTransaction = {
    type: "Charge" | "Payment" | "Refund" | "Adjustment" | "Transfer" | "Opening";
    amount: number; // positive = debit/charge, negative = credit/payment
    description: string;
};

class FolioLedger {
    balance: number;
    transactions: FolioTransaction[];
    status: "Open" | "Closed";

    constructor(initialBalance = 0) {
        this.balance = initialBalance;
        this.transactions = [];
        this.status = "Open";
    }

    postTransaction(type: FolioTransaction["type"], amount: number, description: string) {
        if (this.status === "Closed") {
            throw new Error("Cannot post transaction to a closed folio");
        }

        // Charges must have positive amount
        if (type === "Charge" && amount <= 0) {
            throw new Error("Charge amount must be positive");
        }

        // Payments must have negative amount in balance ledger
        if (type === "Payment" && amount >= 0) {
            throw new Error("Payment amount must reduce the balance (negative signed)");
        }

        this.transactions.push({ type, amount, description });
        this.balance = Math.round((this.balance + amount + Number.EPSILON) * 100) / 100;
        return this.balance;
    }

    closeFolio(): boolean {
        if (Math.abs(this.balance) > 0.01) {
            throw new Error(`Cannot close folio with non-zero balance: ${this.balance}`);
        }
        this.status = "Closed";
        return true;
    }
}

describe("Folio Ledger & Guest Accounting", () => {
    it("accumulates room charges, dining, and spa onto running balance", () => {
        const folio = new FolioLedger(0);

        folio.postTransaction("Charge", 5000, "Room Tariff - Day 1");
        folio.postTransaction("Charge", 1200, "Room Service Dinner");
        folio.postTransaction("Charge", 2500, "Spa Signature Massage");

        expect(folio.balance).toBe(8700);
        expect(folio.transactions).toHaveLength(3);
    });

    it("settles balance with payments and closes cleanly at 0 balance", () => {
        const folio = new FolioLedger(0);

        folio.postTransaction("Charge", 6000, "Room Tariff");
        folio.postTransaction("Payment", -6000, "UPI Settlement via PhonePe");

        expect(folio.balance).toBe(0);
        expect(folio.closeFolio()).toBe(true);
        expect(folio.status).toBe("Closed");
    });

    it("prevents closing folio when guest has an outstanding balance", () => {
        const folio = new FolioLedger(0);
        folio.postTransaction("Charge", 4500, "Room Tariff");
        folio.postTransaction("Payment", -3000, "Partial Cash Payment");

        expect(folio.balance).toBe(1500);
        expect(() => folio.closeFolio()).toThrow(/Cannot close folio with non-zero balance/);
    });

    it("rejects invalid charge signs", () => {
        const folio = new FolioLedger(0);
        expect(() => folio.postTransaction("Charge", -500, "Invalid negative charge")).toThrow(
            /Charge amount must be positive/
        );
    });

    it("handles inter-folio charge transfers accurately", () => {
        const folioA = new FolioLedger(0); // Guest Folio
        const folioB = new FolioLedger(0); // Corporate Company Folio

        // Post charge to Guest Folio
        folioA.postTransaction("Charge", 8000, "Room Tariff Suite");

        // Transfer 8000 from Guest Folio to Corporate Folio
        folioA.postTransaction("Transfer", -8000, "Transferred to Corporate Folio B");
        folioB.postTransaction("Transfer", 8000, "Transferred from Guest Folio A");

        expect(folioA.balance).toBe(0);
        expect(folioB.balance).toBe(8000);
        expect(() => folioA.closeFolio()).not.toThrow();
    });
});
