import React from 'react';
import styles from './ui.module.css';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';
    className?: string;
    style?: React.CSSProperties;
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className = '', style }) => {
    const variants = {
        success: styles.badgeSuccess,
        warning: styles.badgeWarning,
        danger: styles.badgeDanger,
        info: styles.badgeInfo,
        neutral: styles.badgeNeutral,
        primary: styles.badgePrimary,
    };

    return (
        <span
            className={`${styles.badge} ${variants[variant]} ${className}`}
            style={style}
        >
            {children}
        </span>
    );
};

export default Badge;
