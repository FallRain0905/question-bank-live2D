'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';

interface SystemSetting {
    key: string;
    value: string;
    category: string;
    description: string;
    is_encrypted: boolean;
    updated_at: string;
}

export default function AdminSettingsPage() {
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Map<string, string>>(new Map());

    // Nextcloud 配置
    const [nextcloudUrl, setNextcloudUrl] = useState('');
    const [nextcloudUser, setNextcloudUser] = useState('');
    const [nextcloudPassword, setNextcloudPassword] = useState('');
    const [nextcloudPublicUrl, setNextcloudPublicUrl] = useState('');

    // AI 助手配置
    const [qwenApiKey, setQwenApiKey] = useState('');
    const [qwenModel, setQwenModel] = useState('qwen-turbo');

    useEffect(() => {
        checkPermission();
        loadSettings();
    }, []);

    const checkPermission = async () => {
        const { data: { user } } = await getSupabase().auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }

        if (user.user_metadata?.is_admin !== true) {
            router.push('/');
            return;
        }

        setIsAdmin(true);
    };

    const loadSettings = async () => {
        try {
            const supabase = getSupabase();
            const { data, error } = await supabase
                .from('system_settings')
                .select('*');

            if (error) throw error;

            const settingsMap = new Map<string, string>();
            (data || []).forEach((setting: SystemSetting) => {
                settingsMap.set(setting.key, setting.value || '');
            });

            // 填充表单
            setNextcloudUrl(settingsMap.get('nextcloud_url') || '');
            setNextcloudUser(settingsMap.get('nextcloud_user') || '');
            setNextcloudPassword(settingsMap.get('nextcloud_password') || '');
            setNextcloudPublicUrl(settingsMap.get('nextcloud_public_url') || '');
            setQwenApiKey(settingsMap.get('qwen_api_key') || '');
            setQwenModel(settingsMap.get('qwen_model') || 'qwen-turbo');

        } catch (err) {
            console.error('加载配置失败:', err);
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        const newErrors = new Map<string, string>();

        // Nextcloud 验证
        if (nextcloudUrl && !isValidUrl(nextcloudUrl)) {
            newErrors.set('nextcloud_url', '请输入有效的 URL');
        }
        if (nextcloudPublicUrl && !isValidUrl(nextcloudPublicUrl)) {
            newErrors.set('nextcloud_public_url', '请输入有效的 URL');
        }

        // AI 配置验证
        if (qwenApiKey && qwenApiKey.length < 10) {
            newErrors.set('qwen_api_key', 'API Key 长度不正确');
        }

        setErrors(newErrors);
        return newErrors.size === 0;
    };

    const isValidUrl = (url: string) => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    };

    const handleSave = async () => {
        if (!validateForm()) {
            return;
        }

        setSaving(true);
        try {
            const supabase = getSupabase();

            // 更新 Nextcloud 配置
            const nextcloudSettings = [
                { key: 'nextcloud_url', value: nextcloudUrl },
                { key: 'nextcloud_user', value: nextcloudUser },
                { key: 'nextcloud_password', value: nextcloudPassword },
                { key: 'nextcloud_public_url', value: nextcloudPublicUrl }
            ];

            for (const setting of nextcloudSettings) {
                const { error } = await supabase
                    .from('system_settings')
                    .update({ value: setting.value })
                    .eq('key', setting.key);

                if (error) throw error;
            }

            // 更新 AI 助手配置
            const aiSettings = [
                { key: 'qwen_api_key', value: qwenApiKey },
                { key: 'qwen_model', value: qwenModel }
            ];

            for (const setting of aiSettings) {
                const { error } = await supabase
                    .from('system_settings')
                    .update({ value: setting.value })
                    .eq('key', setting.key);

                if (error) throw error;
            }

            alert('配置保存成功！');

        } catch (err: any) {
            console.error('保存配置失败:', err);
            alert('保存失败: ' + (err.message || '未知错误'));
        } finally {
            setSaving(false);
        }
    };

    const handleTestNextcloud = async () => {
        if (!nextcloudUrl || !nextcloudUser || !nextcloudPassword) {
            alert('请先填写 Nextcloud 配置信息');
            return;
        }

        try {
            const response = await fetch('/api/test-nextcloud', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: nextcloudUrl,
                    user: nextcloudUser,
                    password: nextcloudPassword
                })
            });

            const result = await response.json();
            if (result.success) {
                alert('Nextcloud 连接测试成功！');
            } else {
                alert('Nextcloud 连接测试失败: ' + (result.error || '未知错误'));
            }
        } catch (err: any) {
            alert('测试失败: ' + (err.message || '网络错误'));
        }
    };

    const handleTestAI = async () => {
        if (!qwenApiKey) {
            alert('请先填写 AI API Key');
            return;
        }

        try {
            const response = await fetch('/api/test-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey: qwenApiKey,
                    model: qwenModel
                })
            });

            const result = await response.json();
            if (result.success) {
                alert('AI 助手测试成功！');
            } else {
                alert('AI 助手测试失败: ' + (result.error || '未知错误'));
            }
        } catch (err: any) {
            alert('测试失败: ' + (err.message || '网络错误'));
        }
    };

    if (!isAdmin) {
        return (
            <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
                <div className="text-gray-500">加载中...</div>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-64px)] bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">系统配置</h1>
                    <p className="text-gray-600">管理系统级配置项，包括云盘和 AI 助手设置</p>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="mt-4 text-gray-500">加载中...</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Nextcloud 配置 */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-gray-900">Nextcloud 云盘配置</h2>
                                <button
                                    onClick={handleTestNextcloud}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                                >
                                    测试连接
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nextcloud URL *
                                    </label>
                                    <input
                                        type="text"
                                        value={nextcloudUrl}
                                        onChange={(e) => setNextcloudUrl(e.target.value)}
                                        placeholder="https://your-nextcloud.com"
                                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                                            errors.has('nextcloud_url') ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                    />
                                    {errors.has('nextcloud_url') && (
                                        <p className="text-red-600 text-sm mt-1">{errors.get('nextcloud_url')}</p>
                                    )}
                                    <p className="text-gray-500 text-sm mt-1">Nextcloud 服务器的完整 URL</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        用户名 *
                                    </label>
                                    <input
                                        type="text"
                                        value={nextcloudUser}
                                        onChange={(e) => setNextcloudUser(e.target.value)}
                                        placeholder="admin"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                    <p className="text-gray-500 text-sm mt-1">Nextcloud 管理员用户名</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        密码 *
                                    </label>
                                    <input
                                        type="password"
                                        value={nextcloudPassword}
                                        onChange={(e) => setNextcloudPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                    <p className="text-gray-500 text-sm mt-1">Nextcloud 管理员密码（加密存储）</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        公共访问 URL *
                                    </label>
                                    <input
                                        type="text"
                                        value={nextcloudPublicUrl}
                                        onChange={(e) => setNextcloudPublicUrl(e.target.value)}
                                        placeholder="https://your-nextcloud.com"
                                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                                            errors.has('nextcloud_public_url') ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                    />
                                    {errors.has('nextcloud_public_url') && (
                                        <p className="text-red-600 text-sm mt-1">{errors.get('nextcloud_public_url')}</p>
                                    )}
                                    <p className="text-gray-500 text-sm mt-1">用于文件公共访问的 URL</p>
                                </div>
                            </div>
                        </div>

                        {/* AI 助手配置 */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-gray-900">AI 助手配置</h2>
                                <button
                                    onClick={handleTestAI}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                                >
                                    测试连接
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        千问 API Key *
                                    </label>
                                    <input
                                        type="password"
                                        value={qwenApiKey}
                                        onChange={(e) => setQwenApiKey(e.target.value)}
                                        placeholder="sk-xxxxxxxxxxxxxxxxxxxx"
                                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                                            errors.has('qwen_api_key') ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                    />
                                    {errors.has('qwen_api_key') && (
                                        <p className="text-red-600 text-sm mt-1">{errors.get('qwen_api_key')}</p>
                                    )}
                                    <p className="text-gray-500 text-sm mt-1">千问 AI 的 API 密钥（加密存储）</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        AI 模型 *
                                    </label>
                                    <select
                                        value={qwenModel}
                                        onChange={(e) => setQwenModel(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    >
                                        <option value="qwen3-max">qwen3-max (最强模型)</option>
                                        <option value="qwen3.6-plus">qwen3.6-plus (推荐)</option>
                                        <option value="qwen3.5-plus">qwen3.5-plus (平衡性能)</option>
                                        <option value="qwen3.5-flash">qwen3.5-flash (快速响应)</option>
                                        <option value="qwen-vl-max">qwen-vl-max (视觉最强)</option>
                                    </select>
                                    <p className="text-gray-500 text-sm mt-1">选择使用的 AI 模型</p>
                                </div>
                            </div>
                        </div>

                        {/* 保存按钮 */}
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={loadSettings}
                                disabled={loading}
                                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                                重置
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:bg-blue-400 disabled:cursor-not-allowed"
                            >
                                {saving ? '保存中...' : '保存配置'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}