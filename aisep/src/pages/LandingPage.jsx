import React, { useState, useEffect } from 'react';
import {
  Rocket,
  Users,
  ShieldCheck,
  TrendingUp,
  ChevronRight,
  Search,
  Briefcase,
  Star,
  Award,
  Zap,
  Globe
} from 'lucide-react';
import styles from './LandingPage.module.css';
import projectSubmissionService from '../services/projectSubmissionService';
import investorService from '../services/investorService';
import advisorService from '../services/advisorService';
import { getStageLabel } from '../constants/ProjectStatus';
import TermsModal from '../components/common/TermsModal';
import termsService from '../services/termsService';
import optionService from '../services/optionService';

const LandingPage = ({ onShowLogin, onShowRegister }) => {
  const [stats, setStats] = useState({
    projects: 0,
    investors: 0,
    advisors: 0
  });
  const [featuredProjects, setFeaturedProjects] = useState([]);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [termsData, setTermsData] = useState({ version: '', content: '', error: null, isLoading: true });
  const [stages, setStages] = useState([]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    // Intersection Observer for scroll reveal animations
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add(styles.revealActive);
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const revealElements = document.querySelectorAll(`section, .${styles.statItem}, .${styles.roleCard}, .${styles.projectCard}`);
    revealElements.forEach(el => {
      el.classList.add(styles.reveal);
      observer.observe(el);
    });

    window.addEventListener('scroll', handleScroll);

    const fetchData = async () => {
      try {
        const [projRes, invRes, advRes, stagesRes] = await Promise.all([
          projectSubmissionService.getAllProjects(),
          investorService.getAllInvestors({ pageSize: 1 }),
          advisorService.getAllAdvisors({ pageSize: 1 }),
          optionService.getStages()
        ]);

        if (stagesRes) {
          setStages(stagesRes.filter(s => s.isActive));
        }

        setStats({
          projects: projRes?.data?.totalCount || 10,
          investors: invRes?.totalCount || 3,
          advisors: advRes?.totalCount || 5
        });

        if (projRes?.data?.items) {
          const topRated = projRes.data.items
            .filter(p => p.status === 'Approved' || p.status === 1)
            .sort((a, b) => (b.startupPotentialScore || 0) - (a.startupPotentialScore || 0))
            .slice(0, 3);
          setFeaturedProjects(topRated);
        }
      } catch (err) {
        console.error('Landing page data fetch failed:', err);
      }
    };

    fetchData();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      revealElements.forEach(el => observer.unobserve(el));
    };
  }, []);

  const handleShowTerms = async () => {
    setShowTerms(true);
    setTermsData(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await termsService.getActiveTerms();
      const data = response?.data || response;
      if (data) {
        setTermsData({
          version: data.version || 'v1.0',
          content: data.contentHtml || '',
          error: null,
          isLoading: false
        });
      }
    } catch (err) {
      console.error('Failed to fetch terms:', err);
      setTermsData({
        version: '',
        content: '',
        error: err,
        isLoading: false
      });
    }
  };

  return (
    <div className={styles.container}>
      {/* Dynamic Header */}
      <header className={`${styles.header} ${isScrolled ? styles.headerScrolled : ''}`}>
        <div className={styles.logoArea} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <Rocket className={styles.logoIcon} size={28} color="#1d9bf0" />
          <span className={styles.logoText}>AISEP</span>
        </div>
        <div className={`${styles.navActions} ${isScrolled ? styles.navActionsVisible : ''}`}>
          <button className={styles.loginBtn} onClick={onShowLogin}>Đăng nhập</button>
          <button className={styles.registerBtn} onClick={onShowRegister}>Bắt đầu ngay</button>
        </div>
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroBadge}>Hệ sinh thái khởi nghiệp Việt Nam</div>
        <h1 className={styles.heroTitle}>
          Kết nối <span className={styles.gradientText}>Startup Việt</span> với Tương lai của <span className={styles.gradientText}>Đầu tư</span>
        </h1>
        <p className={styles.heroSubtitle}>
          Nền tảng ứng dụng AI giúp đánh giá tiềm năng dự án, minh bạch hóa quy trình đầu tư và tối ưu hóa kết nối giữa Startup, Nhà đầu tư & Cố vấn.
        </p>
        <div className={styles.heroCta}>
          <button className={styles.primaryCta} onClick={onShowRegister}>Bắt đầu</button>
          <button className={styles.secondaryHeroBtn} onClick={onShowLogin}>Đăng nhập</button>
        </div>
      </section>

      {/* Stats Section */}
      <section className={styles.stats}>
        <div className={styles.statsContainer}>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>{stats.projects}+</span>
            <span className={styles.statLabel}>Dự án khởi nghiệp</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>{stats.investors}+</span>
            <span className={styles.statLabel}>Nhà đầu tư</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>{stats.advisors}+</span>
            <span className={styles.statLabel}>Cố vấn chuyên gia</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>100%</span>
            <span className={styles.statLabel}>Minh bạch Blockchain</span>
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className={styles.roles}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Giải pháp cho mọi vị thế</h2>
          <p className={styles.sectionSubtitle}>Dù bạn là ai, AISEP đều có công cụ để bạn thành công.</p>
        </div>
        <div className={styles.roleGrid}>
          {/* Startup */}
          <div className={styles.roleCard}>
            <div className={styles.roleIcon}><Rocket size={32} /></div>
            <h3 className={styles.roleName}>Dành cho Startup</h3>
            <p className={styles.roleDesc}>Vượt qua rào cản gọi vốn bằng cách minh bạch hóa tiềm năng thông qua AI.</p>
            <div className={styles.roleFeatures}>
              <div className={styles.roleFeature}><ShieldCheck className={styles.check} size={18} /> Đánh giá tiềm năng bằng AI</div>
              <div className={styles.roleFeature}><ShieldCheck className={styles.check} size={18} /> Tiếp cận mạng lưới nhà đầu tư</div>
              <div className={styles.roleFeature}><ShieldCheck className={styles.check} size={18} /> Quản lý vòng gọi vốn chuyên nghiệp</div>
            </div>
          </div>

          {/* Investor */}
          <div className={styles.roleCard}>
            <div className={styles.roleIcon}><TrendingUp size={32} /></div>
            <h3 className={styles.roleName}>Dành cho Nhà đầu tư</h3>
            <p className={styles.roleDesc}>Tìm kiếm những "Kỳ lân" tiếp theo với dữ liệu phân tích chuyên sâu và chính xác.</p>
            <div className={styles.roleFeatures}>
              <div className={styles.roleFeature}><ShieldCheck className={styles.check} size={18} /> Công cụ lọc dự án thông minh</div>
              <div className={styles.roleFeature}><ShieldCheck className={styles.check} size={18} /> Theo dõi tiến độ dự án real-time</div>
              <div className={styles.roleFeature}><ShieldCheck className={styles.check} size={18} /> Hợp đồng đầu tư minh bạch</div>
            </div>
          </div>

          {/* Advisor */}
          <div className={styles.roleCard}>
            <div className={styles.roleIcon}><Award size={32} /></div>
            <h3 className={styles.roleName}>Dành cho Cố vấn</h3>
            <p className={styles.roleDesc}>Chia sẻ kinh nghiệm và đồng hành cùng các dự án đầy hứa hẹn.</p>
            <div className={styles.roleFeatures}>
              <div className={styles.roleFeature}><ShieldCheck className={styles.check} size={18} /> Xây dựng uy tín chuyên gia</div>
              <div className={styles.roleFeature}><ShieldCheck className={styles.check} size={18} /> Kết nối trực tiếp với Founders</div>
              <div className={styles.roleFeature}><ShieldCheck className={styles.check} size={18} /> Tham gia hội đồng đánh giá</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Projects Section */}
      <section id="discovery" className={styles.featuredProjects}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Dự án nổi bật</h2>
          <p className={styles.sectionSubtitle}>Khám phá những dự án có điểm tiềm năng cao nhất trên AISEP.</p>
        </div>
        <div className={styles.projectGrid}>
          {featuredProjects.length > 0 ? (
            featuredProjects.map((project) => (
              <div key={project.projectId} className={styles.projectCard}>
                <div className={styles.projectImage}>
                  <img
                    src={project.projectImageUrl || '/project_placeholder_1777480689194.png'}
                    alt={project.projectName}
                  />
                </div>
                <div className={styles.projectContent}>
                  <div className={styles.projectHeader}>
                    <h4 className={styles.projectName}>{project.projectName}</h4>
                  </div>
                  <p className={styles.projectDesc}>{project.shortDescription}</p>
                  <div className={styles.projectFooter}>
                    <span>{project.industries?.[0] || project.industryName || project.industry}</span>
                    <span>{getStageLabel(project.stageOptionId || project.StageOptionId || project.developmentStage || project.DevelopmentStage, stages)}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            [1, 2, 3].map(i => (
              <div key={i} className={styles.projectCard}>
                <div className={styles.projectImage}>
                  <img src="/project_placeholder_1777480689194.png" alt="Placeholder" />
                </div>
                <div className={styles.projectContent}>
                  <div className={styles.projectHeader}>
                    <h4 className={styles.projectName}>Dự án Startup #{i}</h4>
                  </div>
                  <p className={styles.projectDesc}>Mô tả dự án tiêu biểu đang trong quá trình phát triển.</p>
                  <div className={styles.projectFooter}>
                    <span>Industry</span>
                    <span>Stage</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLogo}>
            <Rocket color="#1d9bf0" size={32} />
            <span className={styles.logoText}>AISEP</span>
          </div>
          <div className={styles.footerLinks}>
            <button className={styles.footerLink} onClick={handleShowTerms}>Điều khoản & điều kiện</button>
          </div>
          <p className={styles.copyright}>© 2026 AISEP. Nền tảng kết nối Startup, Nhà đầu tư & Cố vấn chuyên gia hàng đầu Việt Nam.</p>
        </div>
      </footer>

      {showTerms && (
        <TermsModal 
          isOpen={showTerms} 
          onClose={() => setShowTerms(false)} 
          termsContent={termsData.content}
          termsVersion={termsData.version}
          error={termsData.error}
          isLoading={termsData.isLoading}
        />
      )}
    </div>
  );
};

export default LandingPage;
