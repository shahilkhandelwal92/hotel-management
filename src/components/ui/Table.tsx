import React from 'react';
import styles from './ui.module.css';

interface TableProps {
    headers: string[];
    children: React.ReactNode;
    loading?: boolean;
    emptyMessage?: string;
}

const Table: React.FC<TableProps> = ({ headers, children, loading, emptyMessage = 'No data found' }) => {
    return (
        <div className={styles.tableFrame}>
            <div className={styles.tableScroll}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            {headers.map((header, i) => (
                                <th key={i}>{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    {headers.map((_, j) => (
                                        <td key={j} style={{ padding: '1.25rem 1.5rem' }}>
                                            <div className={`${styles.skeleton} animate-pulse`} />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : React.Children.count(children) === 0 ? (
                            <tr>
                                <td colSpan={headers.length} style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            children
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Table;
