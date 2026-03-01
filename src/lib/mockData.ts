export type EventGuest = {
    id: string;
    eventId: string;
    name: string;
    mobile: string;
    email: string;
    status: "Pending" | "Attended";
};

export type CorporateEvent = {
    id: string;
    name: string;
    date: string;
    corporateName: string;
    expectedCount: number;
    accessCode: string; // for corporate login
};

// Global in-memory store for demonstration purposes
export const mockEvents: CorporateEvent[] = [
    {
        id: "evt_1",
        name: "Tech Innovators Summit 2026",
        date: "2026-04-15",
        corporateName: "TechCorp Inc.",
        expectedCount: 150,
        accessCode: "TECH2026",
    },
];

export const mockGuests: EventGuest[] = [
    {
        id: "g_1",
        eventId: "evt_1",
        name: "Alice Smith",
        mobile: "+91 9876543210",
        email: "alice@techcorp.com",
        status: "Attended",
    },
    {
        id: "g_2",
        eventId: "evt_1",
        name: "Bob Johnson",
        mobile: "+91 9876543211",
        email: "bob@techcorp.com",
        status: "Pending",
    },
];
