import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { apiKey, model } = await request.json();

        if (!apiKey) {
            return NextResponse.json(
                { success: false, error: '缺少 API Key' },
                { status: 400 }
            );
        }

        // 测试千问 AI 连接
        try {
            const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model || 'qwen-turbo',
                    messages: [
                        {
                            role: 'user',
                            content: '你好'
                        }
                    ],
                    max_tokens: 10
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.choices && data.choices.length > 0) {
                    return NextResponse.json({ success: true });
                } else {
                    return NextResponse.json(
                        { success: false, error: 'API 返回格式异常' },
                        { status: 500 }
                    );
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                return NextResponse.json(
                    { success: false, error: errorData.message || 'API 认证失败' },
                    { status: response.status }
                );
            }
        } catch (error) {
            console.error('测试 AI 连接失败:', error);
            return NextResponse.json(
                { success: false, error: '网络连接失败' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('测试 AI 连接失败:', error);
        return NextResponse.json(
            { success: false, error: '服务器错误' },
            { status: 500 }
        );
    }
}