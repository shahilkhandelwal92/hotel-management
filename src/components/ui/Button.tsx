import React from 'react';
import styles from './ui.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    className = '',
    disabled,
    style,
    ...props
}) => {
    return (
        <button
            className={`${styles.button} ${styles[variant]} ${styles[size]} ${className}`}
            style={style}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg className="animate-spin" style={{ width: '1rem', height: '1rem' }} viewBox="0 0 24 24">
                        <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading...
                </span>
            ) : children}
        </button>
    );
};

export default Button;
