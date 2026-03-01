import { hashPassword, comparePassword } from '../lib/auth';

jest.mock('jose', () => ({
    SignJWT: jest.fn().mockImplementation(() => ({
        setProtectedHeader: jest.fn().mockReturnThis(),
        setIssuedAt: jest.fn().mockReturnThis(),
        setExpirationTime: jest.fn().mockReturnThis(),
        sign: jest.fn().mockResolvedValue('mocked-jwt-token')
    })),
    jwtVerify: jest.fn().mockResolvedValue({ payload: { mock: 'payload' } })
}));

describe('Authentication Security Utilities', () => {
    it('should securely hash a password into a bcrypt string', async () => {
        const password = 'EnterpriseSecurePassword2026!';

        const hashed = await hashPassword(password);
        expect(hashed).not.toBe(password);
        expect(hashed).toMatch(/^\$2[abxy]\$/); // bcrypt format prefix
        expect(hashed.length).toBeGreaterThan(50);
    });

    it('should successfully verify the correct password against its hash', async () => {
        const password = 'AnotherSecurePassword!@#';

        const hashed = await hashPassword(password);
        const isMatch = await comparePassword(password, hashed);

        expect(isMatch).toBe(true);
    });

    it('should reject an incorrect password', async () => {
        const password = 'CorrectPassword123';
        const wrongPassword = 'WrongPassword456';

        const hashed = await hashPassword(password);
        const isMatch = await comparePassword(wrongPassword, hashed);

        expect(isMatch).toBe(false);
    });
});
