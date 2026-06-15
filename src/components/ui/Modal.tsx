'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './ui.module.css';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className={styles.modalRoot} role="dialog" aria-modal="true" aria-labelledby="dialog-title">
            <div
                className={styles.backdrop}
                onClick={onClose}
            />
            <div className={`${styles.modal} animate-fade-in`}>
                <div className={styles.modalHeader}>
                    <h2 id="dialog-title" className={styles.modalTitle}>{title}</h2>
                    <button onClick={onClose} className={styles.close} aria-label="Close dialog">
                        <X size={18} />
                    </button>
                </div>
                <div className={styles.modalBody}>
                    {children}
                </div>
                {footer && (
                    <div className={styles.modalFooter}>
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
