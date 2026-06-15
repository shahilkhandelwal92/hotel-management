"use client";

import React, { useState, useEffect } from "react";
import {
    User,
    Settings,
    Briefcase,
    ChevronRight,
    ChevronLeft,
    Play,
    CheckCircle2,
    Hotel,
    Pause
} from "lucide-react";
import styles from "./presentation.module.css";
import { useRouter } from "next/navigation";

const presentationSteps = [
    {
        role: "Guest",
        icon: <User size={24} />,
        title: "Seamless Guest Journey",
        slides: [
            {
                heading: "1. Effortless Booking",
                content: "Guests book through the premium web interface or mobile app with real-time room availability.",
                videoLabel: "Booking Flow Demo"
            },
            {
                heading: "2. Contactless Check-In",
                content: "On arrival, guests verify identity via QR code and receive their digital Smart Access key instantly.",
                videoLabel: "Self Check-In & Key Issuance"
            },
            {
                heading: "3. In-House Convenience",
                content: "Order dining services, book amenities, or request housekeeping—all from their personal guest portal.",
                videoLabel: "Guest Services Portal"
            }
        ]
    },
    {
        role: "Staff",
        icon: <Briefcase size={24} />,
        title: "Empowered Workforce",
        slides: [
            {
                heading: "1. Smart Attendance",
                content: "Staff check-in using geofenced, HMAC-signed QR codes ensuring security and accurate logs.",
                videoLabel: "Staff QR Check-In"
            },
            {
                heading: "2. Real-Time Operations",
                content: "Housekeeping and restaurant staff receive instant task updates and order notifications.",
                videoLabel: "Operations Workflow"
            }
        ]
    },
    {
        role: "Admin",
        icon: <Settings size={24} />,
        title: "Absolute Control",
        slides: [
            {
                heading: "1. Financial Oversight",
                content: "Perform daily Night Audits, manage complex GST taxations, and monitor real-time revenue.",
                videoLabel: "Night Audit & Financials"
            },
            {
                heading: "2. Smart Access Management",
                content: "Issue and revoke credentials, monitor entry logs, and manage building security from one hub.",
                videoLabel: "Security Dashboard"
            }
        ]
    }
];
export default function PresentationPage() {
    const [activeRoleIndex, setActiveRoleIndex] = useState(0);
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [frameIndex, setFrameIndex] = useState(1);
    const router = useRouter();

    const currentRole = presentationSteps[activeRoleIndex];
    const currentSlide = currentRole.slides[activeSlideIndex];

    // Video simulation logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying) {
            interval = setInterval(() => {
                setFrameIndex((prev) => {
                    const maxFrames = activeRoleIndex === 0 ? 3 : 2; // Guest has 3 frames, others 2
                    return prev >= maxFrames ? 1 : prev + 1;
                });
            }, 2000); // 2 seconds per frame for "layman-readability"
        }
        return () => clearInterval(interval);
    }, [isPlaying, activeRoleIndex]);

    // Reset video when changing roles or slides
    useEffect(() => {
        setIsPlaying(false);
        setFrameIndex(1);
    }, [activeRoleIndex, activeSlideIndex]);

    const togglePlay = () => setIsPlaying(!isPlaying);

    const handleNext = () => {
        if (activeSlideIndex < currentRole.slides.length - 1) {
            setActiveSlideIndex(prev => prev + 1);
        } else if (activeRoleIndex < presentationSteps.length - 1) {
            setActiveRoleIndex(prev => prev + 1);
            setActiveSlideIndex(0);
        } else {
            router.push('/developer');
        }
    };

    const handlePrev = () => {
        if (activeSlideIndex > 0) {
            setActiveSlideIndex(prev => prev - 1);
        } else if (activeRoleIndex > 0) {
            setActiveRoleIndex(prev => prev - 1);
            setActiveSlideIndex(presentationSteps[activeRoleIndex - 1].slides.length - 1);
        }
    };

    return (
        <div className={styles.container}>
            {/* Role Navigation */}
            <nav className={styles.roleNav}>
                {presentationSteps.map((step, i) => (
                    <button
                        key={i}
                        className={`${styles.roleBtn} ${activeRoleIndex === i ? styles.activeRole : ""}`}
                        onClick={() => { setActiveRoleIndex(i); setActiveSlideIndex(0); }}
                    >
                        {step.icon}
                        <span>{step.role}</span>
                    </button>
                ))}
            </nav>

            {/* Main Presentation Area */}
            <main className={styles.presentationMain}>
                <div className={styles.contentSection}>
                    <div className={styles.header}>
                        <span className={styles.stepIndicator}>
                            Step {activeSlideIndex + 1} of {currentRole.slides.length}
                        </span>
                        <h2 className={styles.roleTitle}>{currentRole.title}</h2>
                    </div>

                    <div className={styles.textContent}>
                        <h3 className={styles.slideHeading}>{currentSlide.heading}</h3>
                        <p className={styles.slideText}>{currentSlide.content}</p>
                    </div>

                    <div className={styles.slideNav}>
                        <button className={styles.iconBtn} onClick={handlePrev} disabled={activeRoleIndex === 0 && activeSlideIndex === 0}>
                            <ChevronLeft />
                        </button>
                        <div className={styles.dots}>
                            {currentRole.slides.map((_, i) => (
                                <div key={i} className={`${styles.dot} ${activeSlideIndex === i ? styles.activeDot : ""}`} />
                            ))}
                        </div>
                        <button className={styles.iconBtn} onClick={handleNext}>
                            {activeRoleIndex === presentationSteps.length - 1 && activeSlideIndex === currentRole.slides.length - 1 ? "Finish" : <ChevronRight />}
                        </button>
                    </div>
                </div>

                {/* Video Area */}
                <div className={styles.mediaSection}>
                    <div
                        className={`${styles.videoPlaceholder} glass-panel ${isPlaying ? styles.isPlaying : ""}`}
                        onClick={togglePlay}
                        style={{
                            backgroundImage: `url(/assets/mockups/${activeRoleIndex === 0 ? "guest" : activeRoleIndex === 1 ? "staff" : "admin"
                                }_${frameIndex}.png)`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                        }}
                    >
                        <div className={styles.playOverlay}>
                            <div className={styles.playButtonWrapper}>
                                {isPlaying ? <Pause size={40} fill="white" color="white" /> : <Play size={40} fill="white" color="white" />}
                            </div>
                            <p className={styles.videoLabel}>
                                {isPlaying ? "Tour in Progress..." : `Play Full Tour: ${currentRole.role} Flow`}
                            </p>
                            {!isPlaying && <span className={styles.videoSubLabel}>Click to start full video tour</span>}
                        </div>
                    </div>
                    <div className={styles.featuresList}>
                        <div className={styles.featureItem}>
                            <CheckCircle2 size={16} color="var(--success)" />
                            <span>Full Data Walkthrough</span>
                        </div>
                        <div className={styles.featureItem}>
                            <CheckCircle2 size={16} color="var(--success)" />
                            <span>Layman Optimized Content</span>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer Branding */}
            <footer className={styles.footer}>
                <div className={styles.brand} onClick={() => router.push('/showcase')}>
                    <Hotel className={styles.goldLogo} />
                    <span>Hotel<strong>Elegance</strong> Presentation</span>
                </div>
            </footer>
        </div>
    );
}
