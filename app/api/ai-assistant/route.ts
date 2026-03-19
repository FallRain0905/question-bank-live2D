import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    if (!question) {
      return NextResponse.json({ error: '请输入问题' }, { status: 400 });
    }

    // 获取用户配置的 AI
    const provider = process.env.AI_PROVIDER || 'qwen';
    const apiKey = process.env.QWEN_API_KEY || process.env.KIMI_API_KEY || '';

    if (!apiKey) {
      return NextResponse.json({ 
        answer: '管理员尚未配置 AI 服务，请联系管理员。' 
      });
    }

    // 根据配置选择 API
    const apiUrl = provider === 'qwen' 
      ? 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
      : 'https://api.moonshot.cn/v1/chat/completions';

    const model = provider === 'qwen' ? 'qwen-plus' : 'moonshot-v1-8k';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: '你是一个友好的学习助手，帮助学生理解题目和知识点。回答要简洁明了，适合学生理解。'
          },
          {
            role: 'user',
            content: question
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ 
        answer: 'AI 服务暂时不可用，请稍后再试。' 
      });
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || '抱歉，我暂时无法回答这个问题。';

    return NextResponse.json({ answer });

  } catch (error: any) {
    console.error('AI Assistant error:', error);
    return NextResponse.json({ 
      answer: '发生错误，请稍后重试。' 
    });
  }
}
