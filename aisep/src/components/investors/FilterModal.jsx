import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './FilterModal.module.css';
import CustomSelect from '../common/CustomSelect';

export default function FilterModal({ filters, onApply, onClose, isOpen, industryOptions = [], stageOptions = [] }) {
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
            industry: 'Tất cả ngành nghề',
            stage: 'Tất cả giai đoạn'
        };
        setLocalFilters(resetFilters);
        onApply(resetFilters);
        onClose();
    };

    if (!isOpen) return null;

    const hasActiveFilters =
        localFilters.industry !== 'Tất cả ngành nghề' ||
        localFilters.stage !== 'Tất cả giai đoạn';

    const industrySelectOptions = [
        { label: 'Tất cả ngành nghề', value: 'Tất cả ngành nghề' },
        ...industryOptions.map(opt => ({ label: opt, value: opt }))
    ];

    const stageSelectOptions = [
        { label: 'Tất cả giai đoạn', value: 'Tất cả giai đoạn' },
        ...stageOptions.map(opt => ({ label: opt, value: opt }))
    ];

    return (
        <div className={styles.filterPanel}>
            <div className={styles.filterHeader}>
                <h3>Lọc nhà đầu tư</h3>
                <button className={styles.closeFilterBtn} onClick={onClose}>
                    <X size={20} />
                </button>
            </div>

            <div className={styles.filterContent}>
                <div className={styles.filterGroup}>
                    <label>Ngành nghề</label>
                    <CustomSelect
                        name="industry"
                        value={localFilters.industry}
                        onChange={(e) => handleChange('industry', e.target.value)}
                        options={industrySelectOptions}
                        placeholder="Tất cả ngành nghề"
                    />
                </div>

                <div className={styles.filterGroup}>
                    <label>Giai đoạn</label>
                    <CustomSelect
                        name="stage"
                        value={localFilters.stage}
                        onChange={(e) => handleChange('stage', e.target.value)}
                        options={stageSelectOptions}
                        placeholder="Tất cả giai đoạn"
                    />
                </div>

            </div>

            <div className={styles.filterActions}>
                {hasActiveFilters && (
                    <button className={styles.clearBtn} onClick={handleReset}>
                        Xóa bộ lọc
                    </button>
                )}
                <button className={styles.applyBtn} onClick={handleApply}>
                    Áp dụng
                </button>
            </div>
        </div>
    );
}
