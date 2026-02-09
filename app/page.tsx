'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';

export default function Home() {
  const [stats, setStats] = useState({ questions: 0, notes: 0, users: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
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
    <div className="min-h-screen bg-white">
      {/* Hero 区域 - Ant Design 风格 */}
      <section className="bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-20 sm:py-28">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl font-semibold text-gray-900 mb-6 leading-tight">
              共享学习资料
              <span className="text-blue-600">高效管理知识</span>
            </h1>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              支持题目、笔记上传，按标签分类，快速检索。让学习资料管理变得简单高效。
            </p>
            <div className="flex gap-4">
              <Link
                href="/search"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                浏览题库
              </Link>
              <Link
                href="/notes"
                className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors"
              >
                浏览笔记
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 数据统计 */}
      <section className="py-16 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-semibold text-gray-900 mb-1">
                {loading ? '...' : stats.questions.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">题目</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-semibold text-gray-900 mb-1">
                {loading ? '...' : stats.notes.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">笔记</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-semibold text-gray-900 mb-1">
                {loading ? '...' : stats.users.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">用户</div>
            </div>
          </div>
        </div>
      </section>

      {/* 功能介绍 - 卡片式 */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-semibold text-gray-900 mb-12 text-center">
            功能特点
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon="📝"
              title="文本输入"
              description="直接输入题目和答案，支持 Markdown 格式"
            />
            <FeatureCard
              icon="📷"
              title="图片识别"
              description="上传题目和答案图片，自动压缩优化"
            />
            <FeatureCard
              icon="📁"
              title="文件管理"
              description="支持 PDF、Word、PPT 等多种格式文件"
            />
            <FeatureCard
              icon="🏷️"
              title="标签分类"
              description="自定义标签，多维度分类管理"
            />
            <FeatureCard
              icon="🔍"
              title="智能搜索"
              description="全文检索，快速定位所需内容"
            />
            <FeatureCard
              icon="💬"
              title="社区互动"
              description="评论交流，收藏喜欢，关注作者"
            />
          </div>
        </div>
      </section>

      {/* CTA 区域 */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            开始使用
          </h2>
          <p className="text-gray-600 mb-8">
            免费注册，立即开始管理你的学习资料
          </p>
          <div className="inline-flex gap-4">
            <Link
              href="/upload"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              上传题目
            </Link>
            <Link
              href="/notes/upload"
              className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors"
            >
              上传笔记
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// 简洁的功能卡片
function FeatureCard({ icon, title, description }: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group p-6 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all">
      <div className="text-2xl mb-3">{icon}</div>
      <h3 className="text-base font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}
