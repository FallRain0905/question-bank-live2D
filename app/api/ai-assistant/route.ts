import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    if (!question) {
      return NextResponse.json({ answer: '请输入问题' });
    }

    // 简单的 AI 模拟响应
    // 实际项目中这里应该调用真实的 AI API
    const answers: Record<string, string> = {
      '你好': '你好！有什么可以帮助你的吗？',
      '你是谁': '我是你的学习助手，可以帮助你解答学习中的问题。',
      '怎么用': '你可以直接输入问题，我会尽力帮你解答。支持题目解答、知识点讲解等。',
    };

    let answer = answers[question];
    
    if (!answer) {
      // 默认回复
      answer = `这是一个很好的问题！"${question}"\n\n很抱歉，我目前还在学习中，暂时无法给出详细解答。建议你：\n\n1. 查看相关教材或课堂笔记\n2. 咨询老师或同学\n3. 稍后再问我，我会不断学习进步的！`;
    }

    return NextResponse.json({ answer });

  } catch (error: any) {
    console.error('AI Assistant error:', error);
    return NextResponse.json({ 
      answer: '抱歉，我遇到了一些问题，请稍后再试。' 
    });
  }
}
