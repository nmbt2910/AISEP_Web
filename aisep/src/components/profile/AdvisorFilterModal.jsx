import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './AdvisorFilterModal.module.css';
import CustomSelect from '../common/CustomSelect';

export default function AdvisorFilterModal({ filters, onApply, onClose, isOpen, expertiseOptions = [] }) {
    const [localFilters, setLocalFilters] = useState(filters);

    useEffect(() => {
        if (isOpen) {
            setLocalFilters(filters);
        }
    }, [isOpen, filters]);

    const handleChange = (field, value) => {
        setLocalFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleApply = () => {
        onApply(localFilters);
        onClose();
    };

    const handleReset = () => {
        const resetFilters = {
            expertise: 'Tất cả chuyên môn',
            minRating: 0,
            maxRate: 5000000 // 5M VNĐ
        };
        setLocalFilters(resetFilters);
        onApply(resetFilters);
        onClose();
    };

    if (!isOpen) return null;

    const hasActiveFilters = 
        localFilters.expertise !== 'Tất cả chuyên môn' ||
        localFilters.minRating > 0 ||
        localFilters.maxRate < 5000000;

    const expertiseSelectOptions = [
        { label: 'Tất cả chuyên môn', value: 'Tất cả chuyên môn' },
        ...expertiseOptions.map(opt => ({ label: opt, value: opt }))
    ];

    return (
        <div className={styles.filterPanel}>
            <div className={styles.filterHeader}>
                <h3>Lọc cố vấn</h3>
                <button
                    className={styles.closeFilterBtn}
                    onClick={onClose}
                >
                    <X size={20} />
                </button>
            </div>

            <div className={styles.filterContent}>
                {/* Expertise Filter */}
                <div className={styles.filterGroup}>
                    <label>Chuyên môn</label>
                    <CustomSelect
                        name="expertise"
                        value={localFilters.expertise}
                        onChange={(e) => handleChange('expertise', e.target.value)}
                        options={expertiseSelectOptions}
                        placeholder="Tất cả chuyên môn"
                    />
                </div>

                {/* Rating Filter */}
                <div className={styles.filterGroup}>
                    <label>Đánh giá tối thiểu: {localFilters.minRating} ⭐</label>
                    <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.5"
                        value={localFilters.minRating}
                        onChange={(e) => handleChange('minRating', parseFloat(e.target.value))}
                        className={styles.rangeSlider}
                    />
                    <div className={styles.scoreLabels}>
                        <span>0</span>
                        <span>2.5</span>
                        <span>5</span>
                    </div>
                </div>

                {/* Rate Filter */}
                <div className={styles.filterGroup}>
                    <label>Mức phí tối đa: {localFilters.maxRate.toLocaleString('vi-VN')} VNĐ/giờ</label>
                    <input
                        type="range"
                        min="0"
                        max="5000000"
                        step="100000"
                        value={localFilters.maxRate}
                        onChange={(e) => handleChange('maxRate', parseInt(e.target.value))}
                        className={styles.rangeSlider}
                    />
                    <div className={styles.scoreLabels}>
                        <span>0</span>
                        <span>2.5M</span>
                        <span>5M</span>
                    </div>
                </div>
            </div>

            <div className={styles.filterActions}>
                {hasActiveFilters && (
                    <button
                        className={styles.clearBtn}
                        onClick={handleReset}
                    >
                        Xóa bộ lọc
                    </button>
                )}
                <button
                    className={styles.applyBtn}
                    onClick={handleApply}
                >
                    Áp dụng
                </button>
            </div>
        </div>
    );
}
