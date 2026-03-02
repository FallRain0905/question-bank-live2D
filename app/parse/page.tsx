'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';
import type { ClassWithRole } from '@/types';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface ParseResult {
  success: boolean;
  markdown?: string;
  error?: string;
  warning?: string;
}

interface ParsedQuestion {
  question_text: string;
  answer_text?: string;
}

interface AIQuestionsResult {
  success: boolean;
  questions: ParsedQuestion[];
  error?: string;
}

type UploadMode = 'single' | 'separate';

// 渲染 LaTeX 公式到 HTML
const renderLatex = (text: string): string => {
  if (!text) return '';

  // 先将换行符转义，避免正则匹配问题
  let result = text;

  // 替换行内公式 $...$（使用 [\s\S]*? 匹配包括换行在内的所有字符）
  result = result.replace(/\$([\s\S]*?)\$/g, (_, latex) => {
    try {
      // 清理可能的转义反斜杠（JSON 存储时 \ 变成了 \\）
      const cleaned = latex.replace(/\\\\/g, '\\');
      return katex.renderToString(cleaned, { displayMode: false });
    } catch {
      return `$${latex}$`;
    }
  });

  // 替换块级公式 \[...\]
  result = result.replace(/\\\[([\s\S]*?)\\\]/g, (_, latex) => {
    try {
      const cleaned = latex.replace(/\\\\/g, '\\');
      return katex.renderToString(cleaned.trim(), { displayMode: true });
    } catch {
      return `\\[${latex}\\]`;
    }
  });

  // 处理剩余的换行符
  result = result.replace(/\n/g, '<br />');

  return result;
};

export default function ParsePage() {
  const router = useRouter();

  const [parsing, setParsing] = useState(false);
  const [aiParsing, setAiParsing] = useState(false);
  const [generatingAnswers, setGeneratingAnswers] = useState(false);

  // 上传模式
  const [uploadMode, setUploadMode] = useState<UploadMode>('single');

  // 单文件模式
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [aiResult, setAiResult] = useState<AIQuestionsResult | null>(null);

  // 双文件模式
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [questionResult, setQuestionResult] = useState<ParseResult | null>(null);
  const [answerResult, setAnswerResult] = useState<ParseResult | null>(null);
  const [pairedResult, setPairedResult] = useState<AIQuestionsResult | null>(null);

  // 班级选择
  const [classes, setClasses] = useState<ClassWithRole[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // AI 配置
  const [aiApiKey, setAiApiKey] = useState('');

  // 题目编辑（使用单一结果）
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingQuestion, setEditingQuestion] = useState('');
  const [editingAnswer, setEditingAnswer] = useState('');

  // 用户信息
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
    loadClasses();
    loadAiConfig();
  }, []);

  const loadClasses = async () => {
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const { data: classesData } = await supabase
        .from('class_members')
        .select(`
          class_id,
          role,
          classes (
            id,
            name
          )
        `)
        .eq('user_id', user.id);

      setClasses(
        classesData?.map((c: any) => ({
          ...c.classes,
          userRole: c.role,
        })) || []
      );
    } catch (err) {
      console.error('获取班级失败:', err);
    }
  };

  const loadAiConfig = () => {
    const saved = localStorage.getItem('kimi_api_key');
    if (saved) {
      setAiApiKey(saved);
    }
  };

  // 保存 API Key 到 localStorage
  useEffect(() => {
    if (aiApiKey) {
      localStorage.setItem('kimi_api_key', aiApiKey);
    }
  }, [aiApiKey]);

  const checkAuth = async () => {
    const response = await fetch('/api/auth/session');
    if (response.status === 401) {
      router.push('/login');
    }
  };

  // 文件验证
  const validateFile = (selectedFile: File) => {
    const SUPPORTED_TYPES = ['text/plain', 'text/markdown', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!SUPPORTED_TYPES.includes(selectedFile.type) && !selectedFile.name.endsWith('.txt') && !selectedFile.name.endsWith('.md') && !selectedFile.name.endsWith('.docx')) {
      alert('不支持的文件格式，请上传 TXT、Markdown 或 DOCX 文件');
      return false;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      alert('文件大小不能超过 10MB');
      return false;
    }
    return true;
  };

  // 单文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (!validateFile(selectedFile)) return;
    setFile(selectedFile);
    setParseResult(null);
    setAiResult(null);
  };

  // 题目文件选择
  const handleQuestionFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (!validateFile(selectedFile)) return;
    setQuestionFile(selectedFile);
    setQuestionResult(null);
    setPairedResult(null);
  };

  // 答案文件选择
  const handleAnswerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (!validateFile(selectedFile)) return;
    setAnswerFile(selectedFile);
    setAnswerResult(null);
    setPairedResult(null);
  };

  // 通用文档解析
  const parseDocument = async (fileToParse: File): Promise<ParseResult> => {
    const formData = new FormData();
    formData.append('file', fileToParse);

    const response = await fetch('/api/parse-document', {
      method: 'POST',
      body: formData,
    });

    return await response.json();
  };

  // 单文件解析
  const handleParse = async () => {
    if (!file) {
      alert('请先选择文件');
      return;
    }

    setParsing(true);
    try {
      const result = await parseDocument(file);
      setParseResult(result);
    } catch (err: any) {
      alert('解析失败: ' + err.message);
    } finally {
      setParsing(false);
    }
  };

  // 双文件解析
  const handleSeparateParse = async () => {
    if (!questionFile) {
      alert('请先选择题目文件');
      return;
    }
    if (!answerFile) {
      alert('请先选择答案文件');
      return;
    }

    setParsing(true);
    try {
      const [qResult, aResult] = await Promise.all([
        parseDocument(questionFile),
        parseDocument(answerFile),
      ]);
      setQuestionResult(qResult);
      setAnswerResult(aResult);
    } catch (err: any) {
      alert('解析失败: ' + err.message);
    } finally {
      setParsing(false);
    }
  };

  // 下载 Markdown
  const handleDownload = (markdown: string, filename: string) => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // AI 提取题目（单文件模式）
  const handleAiExtract = async () => {
    if (!aiApiKey.trim()) {
      alert('请先配置 Kimi API Key');
      return;
    }
    if (!parseResult?.markdown) {
      alert('请先转换文档');
      return;
    }

    setAiParsing(true);
    try {
      const response = await fetch('/api/ai-parse-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: aiApiKey,
          markdown: parseResult.markdown,
        }),
      });

      const result: AIQuestionsResult = await response.json();
      setAiResult(result);

      if (result.success && result.questions.length > 0) {
        setSelectedQuestions(new Set(result.questions.map((_, i) => i.toString())));
      }
    } catch (err: any) {
      alert('AI 解析失败: ' + err.message);
    } finally {
      setAiParsing(false);
    }
  };

  // AI 配对题目和答案（双文件模式）
  const handleAiPair = async () => {
    if (!aiApiKey.trim()) {
      alert('请先配置 Kimi API Key');
      return;
    }
    if (!questionResult?.markdown || !answerResult?.markdown) {
      alert('请先转换两个文档');
      return;
    }

    setAiParsing(true);
    try {
      const response = await fetch('/api/ai-pair-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: aiApiKey,
          questionsMarkdown: questionResult.markdown,
          answersMarkdown: answerResult.markdown,
        }),
      });

      const result: AIQuestionsResult = await response.json();
      setPairedResult(result);

      if (result.success && result.questions.length > 0) {
        setSelectedQuestions(new Set(result.questions.map((_, i) => i.toString())));
      }
    } catch (err: any) {
      alert('AI 配对失败: ' + err.message);
    } finally {
      setAiParsing(false);
    }
  };

  // AI 生成答案
  const handleGenerateAnswers = async () => {
    if (!aiApiKey.trim()) {
      alert('请先配置 Kimi API Key');
      return;
    }
    const currentResult = uploadMode === 'single' ? aiResult : pairedResult;
    if (!currentResult?.questions || currentResult.questions.length === 0) {
      alert('没有可用的题目');
      return;
    }

    setGeneratingAnswers(true);
    try {
      const response = await fetch('/api/ai-generate-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: aiApiKey,
          questions: currentResult.questions,
        }),
      });

      const result: AIQuestionsResult = await response.json();
      if (result.success) {
        const updatedResult = uploadMode === 'single' ? { ...aiResult!, questions: result.questions } : { ...pairedResult!, questions: result.questions };
        if (uploadMode === 'single') {
          setAiResult(updatedResult);
        } else {
          setPairedResult(updatedResult);
        }
        alert('答案生成完成！');
      } else {
        alert('答案生成失败: ' + result.error);
      }
    } catch (err: any) {
      alert('答案生成失败: ' + err.message);
    } finally {
      setGeneratingAnswers(false);
    }
  };

  // 切换题目选择
  const toggleQuestion = (index: string) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedQuestions(newSelected);
  };

  // 全选/取消全选
  const toggleAll = (total: number) => {
    const allIndices = Array.from({ length: total }, (_, i) => i.toString());
    if (selectedQuestions.size === total) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(allIndices));
    }
  };

  // 开始编辑
  const startEdit = (index: number) => {
    const currentResult = uploadMode === 'single' ? aiResult : pairedResult;
    const question = currentResult?.questions[index];
    if (!question) return;
    setEditingIndex(index);
    setEditingQuestion(question.question_text || '');
    setEditingAnswer(question.answer_text || '');
  };

  // 保存编辑
  const saveEdit = (index: number) => {
    const currentResult = uploadMode === 'single' ? aiResult : pairedResult;
    if (currentResult?.questions) {
      const updated = [...currentResult.questions];
      updated[index] = {
        ...updated[index],
        question_text: editingQuestion,
        answer_text: editingAnswer,
      };
      const newResult = { ...currentResult, questions: updated };
      if (uploadMode === 'single') {
        setAiResult(newResult);
      } else {
        setPairedResult(newResult);
      }
    }
    setEditingIndex(null);
    setEditingQuestion('');
    setEditingAnswer('');
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingQuestion('');
    setEditingAnswer('');
  };

  // 导入题目
  const handleImport = async () => {
    if (!selectedClassId) {
      alert('请选择一个班级');
      return;
    }
    const currentResult = uploadMode === 'single' ? aiResult : pairedResult;
    if (!currentResult || selectedQuestions.size === 0) {
      alert('请先进行 AI 解析并选择要导入的题目');
      return;
    }

    if (!confirm(`确定要导入 ${selectedQuestions.size} 道题目吗？`)) return;

    setAiParsing(true);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        alert('请先登录');
        setAiParsing(false);
        return;
      }

      const { createClient } = await import('@supabase/supabase-js');
      const authSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          },
        }
      );

      let successCount = 0;
      let failCount = 0;

      for (const indexStr of selectedQuestions) {
        const index = parseInt(indexStr);
        const question = currentResult.questions[index];

        try {
          const { error } = await authSupabase
            .from('questions')
            .insert({
              user_id: user.id,
              question_text: question.question_text,
              answer_text: question.answer_text || null,
              status: 'pending',
              class_id: selectedClassId,
            })
            .select('id')
            .single();

          if (error) throw error;
          successCount++;
        } catch (err) {
          console.error('插入题目失败:', err);
          failCount++;
        }
      }

      alert(`导入完成！成功: ${successCount}, 失败: ${failCount}`);
      router.push('/me');
    } catch (err: any) {
      alert('导入失败: ' + err.message);
    } finally {
      setAiParsing(false);
    }
  };

  // 获取当前显示的结果
  const getCurrentResult = () => {
    return uploadMode === 'single' ? aiResult : pairedResult;
  };

  // 切换模式时重置状态
  const handleModeChange = (mode: UploadMode) => {
    setUploadMode(mode);
    // 重置选择状态
    setSelectedQuestions(new Set());
    setEditingIndex(null);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* 页头 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">文档转换与导入</h1>
          <p className="text-gray-500 mt-1">上传文档，用 AI 提取题目后导入到我的题库</p>
        </div>

        {/* 模式选择 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">选择上传模式</h2>
          <div className="flex gap-4">
            <button
              onClick={() => handleModeChange('single')}
              className={`flex-1 p-4 rounded-lg border-2 text-left transition ${
                uploadMode === 'single'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-gray-900 mb-1">模式一：单文件上传</div>
              <div className="text-sm text-gray-600">
                上传包含题目（和答案）的文档，AI 自动提取
              </div>
            </button>
            <button
              onClick={() => handleModeChange('separate')}
              className={`flex-1 p-4 rounded-lg border-2 text-left transition ${
                uploadMode === 'separate'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-gray-900 mb-1">模式二：题目答案分离</div>
              <div className="text-sm text-gray-600">
                分别上传题目文档和答案文档，AI 自动配对
              </div>
            </button>
          </div>
        </div>

        {/* AI 配置 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-yellow-900 mb-2">Kimi AI 配置</h3>
          <input
            type="password"
            placeholder="输入 Kimi API Key (sk-...)"
            value={aiApiKey}
            onChange={(e) => setAiApiKey(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none"
          />
          <p className="text-gray-500 text-sm mt-2">
            API Key 保存在浏览器本地，不会被发送到服务器
          </p>
        </div>

        {/* 单文件模式 */}
        {uploadMode === 'single' && (
          <>
            {/* 文件选择 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择文档 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4 items-center">
                  <input
                    type="file"
                    accept=".txt,.md,.docx"
                    onChange={handleFileSelect}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <button
                    onClick={handleParse}
                    disabled={!file || parsing}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed min-w-[120px]"
                  >
                    {parsing ? '转换中...' : '转换文档'}
                  </button>
                </div>
                {file && (
                  <p className="mt-2 text-sm text-gray-600">
                    已选择: <span className="font-medium">{file.name}</span> ({(file.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>
            </div>

            {/* Markdown 预览 */}
            {parseResult?.success && parseResult.markdown && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">文档已转换</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAiExtract}
                      disabled={aiParsing}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {aiParsing ? 'AI 提取中...' : 'AI 提取题目'}
                    </button>
                    <button
                      onClick={() => handleDownload(parseResult.markdown, `${file?.name?.replace(/\.[^/.]+$/, '') || 'document'}.md`)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
                    >
                      下载 Markdown
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 max-h-[300px] overflow-y-auto">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                    {parseResult.markdown.slice(0, 500)}
                    {parseResult.markdown.length > 500 && '...'}
                  </pre>
                </div>
              </div>
            )}
          </>
        )}

        {/* 双文件模式 */}
        {uploadMode === 'separate' && (
          <>
            {/* 题目文件选择 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  题目文档 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4 items-center">
                  <input
                    type="file"
                    accept=".txt,.md,.docx"
                    onChange={handleQuestionFileSelect}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <span className="text-sm text-gray-500">
                    {questionFile ? `已选择: ${questionFile.name}` : '未选择'}
                  </span>
                </div>
              </div>
            </div>

            {/* 答案文件选择 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  答案文档 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4 items-center">
                  <input
                    type="file"
                    accept=".txt,.md,.docx"
                    onChange={handleAnswerFileSelect}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <button
                    onClick={handleSeparateParse}
                    disabled={!questionFile || !answerFile || parsing}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed min-w-[120px]"
                  >
                    {parsing ? '转换中...' : '转换两个文档'}
                  </button>
                </div>
                {answerFile && (
                  <p className="mt-2 text-sm text-gray-600">
                    已选择: <span className="font-medium">{answerFile.name}</span> ({(answerFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>
            </div>

            {/* 预览和 AI 配对 */}
            {questionResult?.success && answerResult?.success && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">两个文档已转换</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAiPair}
                      disabled={aiParsing}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {aiParsing ? 'AI 配对中...' : 'AI 配对题目和答案'}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">题目预览</h3>
                    <div className="bg-gray-50 rounded-lg p-3 max-h-[200px] overflow-y-auto">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                        {questionResult.markdown.slice(0, 200)}
                        {questionResult.markdown.length > 200 && '...'}
                      </pre>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">答案预览</h3>
                    <div className="bg-gray-50 rounded-lg p-3 max-h-[200px] overflow-y-auto">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                        {answerResult.markdown.slice(0, 200)}
                        {answerResult.markdown.length > 200 && '...'}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* 题目列表和导入 */}
        {getCurrentResult()?.success && getCurrentResult()?.questions.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            {/* 班级选择 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                导入到班级 <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">请选择班级</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                    {cls.userRole === 'creator' && ' (管理员)'}
                  </option>
                ))}
              </select>
              {classes.length === 0 && (
                <p className="mt-1 text-sm text-gray-500">
                  还没有加入班级，请先{' '}
                  <Link href="/classes" className="text-blue-600 hover:text-blue-700">
                    创建或加入班级
                  </Link>
                </p>
              )}
            </div>

            {/* AI 生成答案按钮（当有题目但没有答案时显示） */}
            {getCurrentResult()!.questions.some(q => !q.answer_text) && (
              <div className="mb-4">
                <button
                  onClick={handleGenerateAnswers}
                  disabled={generatingAnswers || !aiApiKey}
                  className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {generatingAnswers ? 'AI 生成答案中...' : 'AI 为所有题目生成答案'}
                </button>
              </div>
            )}

            {/* 题目列表 */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                提取的题目 ({getCurrentResult()!.questions.length} 道)
              </h2>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={selectedQuestions.size === getCurrentResult()!.questions.length}
                    onChange={() => toggleAll(getCurrentResult()!.questions.length)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  全选
                </label>
                <button
                  onClick={handleImport}
                  disabled={aiParsing || selectedQuestions.size === 0 || !selectedClassId}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {aiParsing ? '导入中...' : `导入 ${selectedQuestions.size} 道题目`}
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {getCurrentResult()!.questions.map((question, index) => {
                const isSelected = selectedQuestions.has(index.toString());
                const isEditing = editingIndex === index;

                return (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 transition ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleQuestion(index.toString())}
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            题目 {index + 1}
                          </span>
                          {!question.answer_text && (
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                              无答案
                            </span>
                          )}
                          {!isEditing && (
                            <button
                              onClick={() => startEdit(index)}
                              className="text-xs text-blue-600 hover:text-blue-700"
                            >
                              编辑
                            </button>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="space-y-2">
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1">题目内容</label>
                              <textarea
                                value={editingQuestion}
                                onChange={(e) => setEditingQuestion(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1">答案内容</label>
                              <textarea
                                value={editingAnswer}
                                onChange={(e) => setEditingAnswer(e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveEdit(index)}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                              >
                                保存
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="mb-2">
                              <div
                                className="text-sm text-gray-900 prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: renderLatex(question.question_text) }}
                              />
                            </div>
                            {question.answer_text ? (
                              <div>
                                <p className="text-xs text-gray-500 mb-1">答案：</p>
                                <div
                                  className="text-sm text-gray-700 prose prose-sm max-w-none"
                                  dangerouslySetInnerHTML={{ __html: renderLatex(question.answer_text) }}
                                />
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 italic">暂无答案</p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 错误信息 */}
        {(parseResult && !parseResult.success) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-medium">{parseResult.error}</p>
          </div>
        )}

        {getCurrentResult() && !getCurrentResult()!.success && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-medium">{getCurrentResult()!.error}</p>
          </div>
        )}

        {/* 返回链接 */}
        <div className="mt-6 text-center">
          <Link href="/upload" className="text-blue-600 hover:text-blue-700">
            ← 返回手动上传
          </Link>
        </div>
      </div>
    </div>
  );
}
