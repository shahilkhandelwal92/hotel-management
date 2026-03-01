"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface UseIdleTimeoutOptions {
    timeoutMinutes?: number;
    warningSeconds?: number;
    onTimeout?: () => void;
    isApp?: boolean;
}

export function useIdleTimeout({
    timeoutMinutes = 15,
    warningSeconds = 60,
    isApp = false,
}: UseIdleTimeoutOptions = {}) {
    const [showWarning, setShowWarning] = useState(false);
    const [countdown, setCountdown] = useState(warningSeconds);
    const router = useRouter();

    const logout = useCallback(async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
    }, [router]);

    useEffect(() => {
        // Skip idle timeout for mobile app — stays logged in
        if (isApp || typeof window === "undefined") return;

        const TIMEOUT_MS = timeoutMinutes * 60 * 1000;
        const WARNING_MS = warningSeconds * 1000;
        let idleTimer: ReturnType<typeof setTimeout>;
        let warningTimer: ReturnType<typeof setTimeout>;
        let countdownInterval: ReturnType<typeof setInterval>;

        const resetTimers = () => {
            clearTimeout(idleTimer);
            clearTimeout(warningTimer);
            clearInterval(countdownInterval);
            setShowWarning(false);
            setCountdown(warningSeconds);

            // Show warning at timeout - warningSeconds
            warningTimer = setTimeout(() => {
                setShowWarning(true);
                setCountdown(warningSeconds);
                countdownInterval = setInterval(() => {
                    setCountdown(prev => {
                        if (prev <= 1) {
                            clearInterval(countdownInterval);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            }, TIMEOUT_MS - WARNING_MS);

            // Logout after full timeout
            idleTimer = setTimeout(() => {
                logout();
            }, TIMEOUT_MS);
        };

        const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
        events.forEach(e => window.addEventListener(e, resetTimers, { passive: true }));
        resetTimers(); // Start on mount

        return () => {
            clearTimeout(idleTimer);
            clearTimeout(warningTimer);
            clearInterval(countdownInterval);
            events.forEach(e => window.removeEventListener(e, resetTimers));
        };
    }, [timeoutMinutes, warningSeconds, isApp, logout]);

    return { showWarning, countdown, logout };
}
