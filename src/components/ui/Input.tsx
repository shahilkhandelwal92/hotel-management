import React from 'react';
import styles from './ui.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

const Input: React.FC<InputProps> = ({ label, error, className = '', style, ...props }) => {
    return (
        <div className={styles.inputGroup}>
            {label && <label className={styles.label}>{label}</label>}
            <input
                style={style}
                className={`${styles.input} ${error ? styles.inputError : ''} ${className}`}
                {...props}
            />
            {error && <span className={styles.errorText}>{error}</span>}
        </div>
    );
};

export default Input;
