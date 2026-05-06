import React, { useState, useEffect } from 'react';
import pdfMakeModule from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { X, Loader2, FileText, Sparkles } from 'lucide-react';
import styles from './DueDiligenceFormModal.module.css';

const pdfMake = pdfMakeModule?.default || pdfMakeModule;

// Initialize fonts statically to avoid Vite/Webpack dynamic import issues with UMD modules
const vfs = pdfFonts?.pdfMake?.vfs || pdfFonts?.default?.pdfMake?.vfs || pdfFonts?.vfs || window?.pdfMake?.vfs;
if (vfs) {
  pdfMake.vfs = vfs;
  pdfMake.fonts = {
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf'
    }
  };
} else {
  console.error("Could not find pdfMake VFS from pdfFonts:", pdfFonts);
}

let isPdfFontsReady = !!vfs;

async function ensurePdfFonts() {
  if (isPdfFontsReady && pdfMake?.vfs) return;
  // Fallback if static initialization somehow failed but we still try
  if (!pdfMake?.vfs) {
    throw new Error('Không thể tìm thấy dữ liệu font PDF. Vui lòng thử lại.');
  }
}


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
      await ensurePdfFonts();
      const dateStr = new Date().toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      const content = [
        {
          table: {
            widths: ['*'],
            body: [[{ text: template?.documentTitle || 'TÀI LIỆU THẨM ĐỊNH CHI TIẾT', style: 'title' }]],
          },
          layout: {
            hLineWidth: () => 0,
            vLineWidth: () => 0,
            paddingLeft: () => 14,
            paddingRight: () => 14,
            paddingTop: () => 12,
            paddingBottom: () => 12,
            fillColor: () => '#EAF3FF',
          },
          margin: [0, 0, 0, 14],
        },
        {
          columns: [
            { text: `Dự án: ${projectName || template?.title || '[Tên dự án]'}`, style: 'meta' },
            { text: `Thời gian tạo: ${dateStr}`, style: 'meta', alignment: 'right' },
          ],
          columnGap: 12,
          margin: [0, 0, 0, 14],
        },
      ];

      sections.forEach((section) => {
        const sectionItems = Array.isArray(section.items) ? section.items : [];
        const questionBlocks = sectionItems.map((item, idx) => {
          const key = item.key || `${section.key}-${idx}`;
          const answer = String(answers[key] || '').trim();
          return {
            unbreakable: false,
            margin: [0, 0, 0, 10],
            stack: [
              { text: item.title || 'Câu hỏi', style: 'question' },
              {
                text: answer || 'Chưa có nội dung trả lời.',
                style: answer ? 'answer' : 'answerEmpty',
              },
            ],
          };
        });

        content.push({
          stack: [
            { text: section.title || 'Nội dung', style: 'sectionTitle', margin: [0, 0, 0, 10] },
            ...questionBlocks,
          ],
          margin: [0, 0, 0, 12],
        });
      });

      const docDefinition = {
        pageSize: 'A4',
        pageMargins: [32, 32, 32, 32],
        defaultStyle: {
          font: 'Roboto',
          fontSize: 10.8,
          color: '#111827',
          lineHeight: 1.35,
        },
        content,
        styles: {
          title: { fontSize: 17, bold: true, color: '#0F172A' },
          meta: { fontSize: 10.2, color: '#334155' },
          sectionTitle: { fontSize: 12.5, bold: true, color: '#1E3A8A' },
          question: { fontSize: 11.2, bold: true, color: '#0F172A', margin: [0, 0, 0, 4] },
          answer: {
            fontSize: 10.8,
            color: '#111827',
            margin: [0, 0, 0, 2],
            background: '#FFFFFF',
          },
          answerEmpty: {
            fontSize: 10.8,
            color: '#64748B',
            italics: true,
          },
        },
      };

      const blob = await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Tạo PDF quá thời gian chờ. Vui lòng thử lại.'));
        }, 20000);
        try {
          pdfMake.createPdf(docDefinition).getBlob((result) => {
            clearTimeout(timeoutId);
            resolve(result);
          });
        } catch (err) {
          clearTimeout(timeoutId);
          reject(err);
        }
      });

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

