'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

export default function Home() {
  const [stats, setStats] = useState({ questions: 0, notes: 0, users: 0 });
  const [loading, setLoading] = useState(true);
  const [currentWord, setCurrentWord] = useState(0);
  const words = ['题目管理', '学习笔记', '知识图谱', '智能检索'];

  useEffect(() => {
    loadStats();
    const wordInterval = setInterval(() => {
      setCurrentWord((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(wordInterval);
  }, []);

  const loadStats = async () => {
    try {
      const supabase = getSupabase();
      const { count: questionsCount } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');
      const { count: notesCount } = await supabase
        .from('notes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');
      const { count: usersCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });
      setStats({
        questions: questionsCount || 0,
        notes: notesCount || 0,
        users: usersCount || 0,
      });
    } catch (err) {
      console.error('加载统计数据失败:', err);
      setStats({ questions: 0, notes: 0, users: 0 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* 背景装饰 - 只在没有自定义背景时显示 */}
      <div className="fixed inset-0 pointer-events-none theme-bg-gradient" />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-brand-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-40 -right-20 w-96 h-96 bg-brand-300 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-32 left-1/3 w-80 h-80 bg-brand-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000" />
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            {/* 标签 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm text-brand-700 rounded-full text-sm font-medium mb-8 border border-brand-200 shadow-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
              </span>
              开源免费，随时随地访问
            </motion.div>

            {/* 主标题 */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold text-brand-800 mb-6 tracking-tight leading-tight"
            >
              共享学习资料<br className="hidden sm:block" />
              <span className="inline-block relative">
                <motion.span
                  key={currentWord}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700"
                >
                  {words[currentWord]}
                </motion.span>
              </span>
            </motion.h1>

            {/* 副标题 */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg sm:text-xl text-brand-600 max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              支持文档解析、AI 辅助、多端同步。让学习资料管理变得简单高效。
            </motion.p>

            {/* 按钮组 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link
                href="/search"
                className="group px-8 py-4 bg-brand-500 text-white rounded-full hover:bg-brand-600 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2 font-medium"
              >
                浏览题库
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/notes"
                className="px-8 py-4 bg-white text-brand-700 border border-brand-200 rounded-full hover:border-brand-300 hover:bg-brand-50 transition-all hover:-translate-y-0.5 font-medium shadow-sm"
              >
                浏览笔记
              </Link>
            </motion.div>
          </motion.div>

          {/* Bento Grid 功能展示 */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {/* 大卡片 */}
            <BentoCard
              icon="📚"
              title="智能题库"
              description="支持文本、图片、PDF、DOCX 多种格式上传，AI 自动解析题目内容"
              size="large"
            />
            <div className="grid grid-rows-2 gap-4">
              <BentoCard
                icon="📝"
                title="学习笔记"
                description="整理学习心得，分享优质内容"
                size="small"
              />
              <BentoCard
                icon="🏷️"
                title="标签分类"
                description="自定义标签，多维度管理"
                size="small"
              />
            </div>
            <BentoCard
              icon="🎓"
              title="班级系统"
              description="创建学习班级，邀请同学加入，共享专属学习资源"
              size="large"
            />
          </motion.div>
        </div>
      </section>

      {/* 数据统计 */}
      <section className="py-8">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl border border-brand-200 shadow-lg p-8"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 divide-y sm:divide-y-0 sm:divide-x divide-brand-200">
              <StatItem
                value={loading ? '...' : stats.questions.toLocaleString()}
                label="题目"
                delay={0.1}
              />
              <StatItem
                value={loading ? '...' : stats.notes.toLocaleString()}
                label="笔记"
                delay={0.2}
              />
              <StatItem
                value={loading ? '...' : stats.users.toLocaleString()}
                label="用户"
                delay={0.3}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* 功能特点 */}
      <section className="py-8">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-brand-700 mb-4">
              强大的功能，极致的体验
            </h2>
            <p className="text-brand-500 max-w-2xl mx-auto">
              从内容管理到社交互动，满足你学习中的所有需求
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard icon="📷" title="图片识别" description="上传题目和答案图片，自动压缩优化，清晰呈现" />
            <FeatureCard icon="📁" title="文档解析" description="支持 PDF、Word 等多种格式文件，智能提取内容" />
            <FeatureCard icon="🤖" title="AI 辅助" description="AI 智能解析题目，自动生成答案，提升效率" />
            <FeatureCard icon="🔍" title="智能搜索" description="全文检索，标签筛选，快速定位所需内容" />
            <FeatureCard icon="💬" title="社区互动" description="评论交流，收藏喜欢，关注作者，构建学习圈子" />
            <FeatureCard icon="📊" title="公式渲染" description="原生支持 LaTeX 数学公式渲染，专业呈现数学内容" />
          </div>
        </div>
      </section>

      {/* CTA 区域 */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 rounded-3xl p-12 text-center text-white"
          >
            {/* 背景装饰 */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                开始你的学习之旅
              </h2>
              <p className="text-white/90 mb-8 max-w-xl mx-auto">
                免费注册，立即开始管理你的学习资料，与更多学习者分享知识
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/upload"
                  className="px-8 py-4 bg-white text-brand-600 rounded-full hover:bg-brand-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 font-medium"
                >
                  上传题目
                </Link>
                <Link
                  href="/notes/upload"
                  className="px-8 py-4 bg-white/20 text-white border border-white/30 rounded-full hover:bg-white/30 transition-all font-medium"
                >
                  上传笔记
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 页脚 */}
      <footer className="py-12 border-t border-brand-200 bg-brand-950">
        <div className="max-w-5xl mx-auto px-4 text-center text-brand-300 text-sm">
          <p>Built with Next.js + Supabase</p>
        </div>
      </footer>
    </div>
  );
}

// Bento Grid 卡片
function BentoCard({
  icon,
  title,
  description,
  size = 'large',
}: {
  icon: string;
  title: string;
  description: string;
  size?: 'small' | 'large';
}) {
  const heightClass = size === 'small' ? 'min-h-[120px]' : 'min-h-[264px]';

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`group relative overflow-hidden ${heightClass} bg-white/90 border border-brand-200 rounded-2xl p-6 transition-all hover:border-brand-300 hover:shadow-lg`}
    >
      <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{icon}</div>
      <h3 className="text-lg font-semibold text-brand-700 mb-2">{title}</h3>
      <p className="text-sm text-brand-500 leading-relaxed">{description}</p>
    </motion.div>
  );
}

// 统计项
function StatItem({ value, label, delay }: { value: string | number; label: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      viewport={{ once: true }}
      className="text-center px-4"
    >
      <div className="text-4xl sm:text-5xl font-bold text-brand-600 mb-2">
        {value}
      </div>
      <div className="text-sm text-brand-500 font-medium">{label}</div>
    </motion.div>
  );
}

// 功能卡片
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="group p-6 bg-white/80 border border-brand-200 rounded-2xl hover:border-brand-300 hover:shadow-lg transition-all duration-300"
    >
      <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center text-2xl">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-brand-700 mb-2 mt-4">{title}</h3>
      <p className="text-sm text-brand-500 leading-relaxed">{description}</p>
    </motion.div>
  );
}
