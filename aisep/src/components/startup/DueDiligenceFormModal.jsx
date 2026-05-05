import React from 'react';
import { jsPDF } from 'jspdf';
import { X, Loader2, FileText, Sparkles } from 'lucide-react';
import styles from './DueDiligenceFormModal.module.css';

function slugify(value) {
  return String(value || 'du-an')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function normalizePdfText(value) {
  return String(value ?? '')
    .replaceAll('Đ', 'D')
    .replaceAll('đ', 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export default function DueDiligenceFormModal({
  isOpen,
  template,
  projectName,
  isGenerating = false,
  onClose,
  onGeneratePdfAndUpload,
}) {
  const [answers, setAnswers] = React.useState({});
  const [errors, setErrors] = React.useState({});
  const [submitError, setSubmitError] = React.useState('');
  const [isPreparingPdf, setIsPreparingPdf] = React.useState(false);
  const [isClosing, setIsClosing] = React.useState(false);
  const answerRefs = React.useRef({});

  const sections = React.useMemo(() => (Array.isArray(template?.sections) ? template.sections : []), [template]);
  const allItems = React.useMemo(
    () =>
      sections.flatMap((section) =>
        (Array.isArray(section.items) ? section.items : []).map((item) => ({
          ...item,
          sectionTitle: section.title || '',
          sectionKey: section.key || '',
        }))
      ),
    [sections]
  );

  React.useEffect(() => {
    if (!isOpen) {
      setIsClosing(false);
      return;
    }
    const seeded = {};
    allItems.forEach((item, idx) => {
      const k = item.key || `${item.sectionKey}-${idx}`;
      seeded[k] = answers[k] || '';
    });
    setAnswers(seeded);
    setErrors({});
    setSubmitError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, template]);

  const handleClose = React.useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  }, [onClose]);

  if (!isOpen && !isClosing) return null;

  const validate = () => {
    const hasAnyAnswer = Object.values(answers).some((value) => String(value || '').trim().length > 0);
    setErrors({});
    if (!hasAnyAnswer) {
      setSubmitError('Vui lòng nhập ít nhất 1 nội dung trước khi xuất PDF.');
      const firstKey = allItems[0]?.key || `${allItems[0]?.sectionKey}-${allItems[0]?.title}`;
      const target = answerRefs.current[firstKey];
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => target.focus(), 180);
      }
      return false;
    }
    return true;
  };

  const handleGenerate = async () => {
    if (!validate()) return;
    setSubmitError('');
    setIsPreparingPdf(true);
    try {
      const dateStr = new Date().toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 36;
      const maxWidth = pageWidth - margin * 2;
      let y = margin;

      const write = (text, options = {}) => {
        const { size = 11, style = 'normal', spaceAfter = 7, indent = 0 } = options;
        doc.setFont('helvetica', style);
        doc.setFontSize(size);
        doc.setTextColor(17, 24, 39);
        const lines = doc.splitTextToSize(normalizePdfText(text || '—'), Math.max(40, maxWidth - indent));
        lines.forEach((line) => {
          if (y > pageHeight - margin) {
            doc.addPage();
            y = margin;
          }
          doc.text(line, margin + indent, y);
          y += size * 1.35;
        });
        y += spaceAfter;
      };

      write(template?.documentTitle || 'TAI LIEU THAM DINH CHI TIET', { size: 16, style: 'bold', spaceAfter: 10 });
      write(`Du an: ${projectName || template?.title || '[TEN DU AN]'}`, { size: 11, spaceAfter: 4 });
      write(`Thoi gian tao: ${dateStr}`, { size: 10.5, spaceAfter: 10 });
      if (template?.note) write(template.note, { size: 10.5, spaceAfter: 10 });

      sections.forEach((section) => {
        write(section.title || '', { size: 13, style: 'bold', spaceAfter: 6 });
        (Array.isArray(section.items) ? section.items : []).forEach((item, idx) => {
          const key = item.key || `${section.key}-${idx}`;
          const ans = String(answers[key] || '').trim();
          write(item.title || '', { size: 11.5, style: 'bold', spaceAfter: 4 });
          (Array.isArray(item.bullets) ? item.bullets : []).forEach((bullet) => {
            write(`- ${bullet}`, { size: 10.3, indent: 10, spaceAfter: 2 });
          });
          write('Noi dung startup cung cap:', { size: 10.5, style: 'bold', spaceAfter: 2 });
          write(ans || '—', { size: 11, spaceAfter: 10 });
        });
      });

      const blob = doc.output('blob');

      const fileName = `due-diligence-${slugify(projectName || template?.title)}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });
      await onGeneratePdfAndUpload?.(file);
    } catch (error) {
      console.error('Error generating due diligence pdf:', error);
      setSubmitError('Không thể xuất PDF. Vui lòng thử lại hoặc tải lại trang.');
    } finally {
      setIsPreparingPdf(false);
    }
  };

  return (
    <div className={`${styles.overlay} ${isClosing ? styles.overlayClosing : ''}`} onClick={handleClose}>
      <div
        className={`${styles.panel} ${isClosing ? styles.panelClosing : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>
              <FileText size={22} />
            </div>
            <div>
              <div className={styles.headerTitle}>Điền hồ sơ Due Diligence</div>
              <div className={styles.headerSubtitle}>Hoàn tất biểu mẫu rồi xuất PDF để nộp tự động</div>
            </div>
          </div>
          <button type="button" onClick={handleClose} className={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.scroll}>
          {template?.note ? (
            <div className={styles.noteBox}>
              <Sparkles size={18} style={{ marginTop: 2, flexShrink: 0 }} />
              <span>{template.note}</span>
            </div>
          ) : null}

          {sections.map((section, secIdx) => (
            <div key={section.key || secIdx} className={styles.sectionCard}>
              <div className={styles.sectionHeader}>{section.title}</div>
              <div className={styles.sectionBody}>
                {(Array.isArray(section.items) ? section.items : []).map((item, idx) => {
                  const key = item.key || `${section.key}-${idx}`;
                  return (
                    <div key={key} className={styles.questionWrap}>
                      <div className={styles.questionTitle}>{item.title}</div>
                      {Array.isArray(item.bullets) && item.bullets.length > 0 ? (
                        <ul className={styles.questionHint}>
                          {item.bullets.map((b, i) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      ) : null}
                      <div className={styles.answerLabel}>Nội dung trả lời</div>
                      <textarea
                        className={`${styles.answerInput} ${errors[key] ? styles.answerInputError : ''}`}
                        ref={(node) => {
                          if (node) answerRefs.current[key] = node;
                        }}
                        value={answers[key] || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setAnswers((prev) => ({ ...prev, [key]: value }));
                          if (String(value || '').trim()) {
                            setErrors((prev) => {
                              if (!prev[key]) return prev;
                              const cloned = { ...prev };
                              delete cloned[key];
                              return cloned;
                            });
                          }
                        }}
                        placeholder="Nhập nội dung bạn muốn hệ thống AI đối chiếu..."
                        spellCheck={false}
                      />
                      {errors[key] ? <span className={styles.errorText}>{errors[key]}</span> : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          {submitError ? <span className={styles.errorText}>{submitError}</span> : null}
          <button type="button" onClick={handleClose} className={styles.secondaryBtn}>
            Đóng
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || isPreparingPdf}
            className={styles.primaryBtn}
          >
            {isGenerating || isPreparingPdf ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Đang xử lý...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Xuất PDF & tải lên</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

