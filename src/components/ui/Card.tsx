import React from 'react';
import styles from './ui.module.css';

interface CardProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    className?: string;
    headerAction?: React.ReactNode;
    style?: React.CSSProperties;
    onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ children, title, subtitle, className = '', headerAction, style, onClick }) => {
    return (
        <div
            className={`${styles.card} ${className}`}
            onClick={onClick}
            data-clickable={Boolean(onClick)}
            style={style}
        >
            {(title || subtitle || headerAction) && (
                <div className={styles.cardHeader}>
                    <div>
                        {title && <h3 className={styles.cardTitle}>{title}</h3>}
                        {subtitle && <p className={styles.cardSubtitle}>{subtitle}</p>}
                    </div>
                    {headerAction && <div>{headerAction}</div>}
                </div>
            )}
            <div className={styles.cardBody}>
                {children}
            </div>
        </div>
    );
};

export default Card;
