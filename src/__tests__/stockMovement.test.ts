// Unit testing kitchen & grocery inventory stock ledger math and low-stock alerts

type StockMovementType = "IN" | "OUT" | "ADJUST";

class StockItemLedger {
    id: string;
    itemName: string;
    unit: string;
    quantity: number;
    minAlert: number;

    constructor(id: string, itemName: string, unit: string, initialQuantity: number, minAlert: number) {
        this.id = id;
        this.itemName = itemName;
        this.unit = unit;
        this.quantity = initialQuantity;
        this.minAlert = minAlert;
    }

    recordMovement(type: StockMovementType, amount: number): { newQuantity: number; isLowStock: boolean } {
        if (amount <= 0 || !Number.isFinite(amount)) {
            throw new Error("Movement amount must be a positive finite number");
        }

        if (type === "IN") {
            this.quantity += amount;
        } else if (type === "OUT") {
            if (this.quantity < amount) {
                throw new Error(`Insufficient stock for ${this.itemName}. Have ${this.quantity}, need ${amount}`);
            }
            this.quantity -= amount;
        } else if (type === "ADJUST") {
            this.quantity = amount;
        }

        this.quantity = Math.round((this.quantity + Number.EPSILON) * 1000) / 1000;
        const isLowStock = this.quantity <= this.minAlert;

        return { newQuantity: this.quantity, isLowStock };
    }
}

describe("Kitchen & Grocery Inventory Stock Control", () => {
    it("handles inward procurement (IN) and consumption (OUT)", () => {
        const paneerStock = new StockItemLedger("stock-1", "Paneer / Cottage Cheese", "kg", 20.0, 5.0);

        // Receive 10kg
        const inResult = paneerStock.recordMovement("IN", 10.0);
        expect(inResult.newQuantity).toBe(30.0);
        expect(inResult.isLowStock).toBe(false);

        // Consume 15kg for banquet dining
        const outResult = paneerStock.recordMovement("OUT", 15.0);
        expect(outResult.newQuantity).toBe(15.0);
        expect(outResult.isLowStock).toBe(false);
    });

    it("triggers low-stock alert when quantity drops to or below threshold", () => {
        const milkStock = new StockItemLedger("stock-2", "Full Cream Milk", "litres", 10.0, 5.0);

        // Consume 6 litres -> Remaining 4.0 litres (below minAlert of 5.0)
        const result = milkStock.recordMovement("OUT", 6.0);
        expect(result.newQuantity).toBe(4.0);
        expect(result.isLowStock).toBe(true);
    });

    it("blocks negative stock consumption when inventory is insufficient", () => {
        const oilStock = new StockItemLedger("stock-3", "Cooking Oil", "litres", 2.0, 5.0);

        expect(() => oilStock.recordMovement("OUT", 5.0)).toThrow(/Insufficient stock/);
        // Ensure stock quantity was not corrupted
        expect(oilStock.quantity).toBe(2.0);
    });

    it("allows physical audit adjustments (ADJUST)", () => {
        const riceStock = new StockItemLedger("stock-4", "Basmati Rice", "kg", 50.0, 10.0);

        // Audit finds actual weight is 48.5 kg
        const result = riceStock.recordMovement("ADJUST", 48.5);
        expect(result.newQuantity).toBe(48.5);
    });
});
