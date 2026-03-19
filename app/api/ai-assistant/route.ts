import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { question, history, image } = await req.json();

    if (!question && !image) {
      return NextResponse.json({ answer: '请输入问题或上传图片' });
    }

    // 获取千问 API Key
    const apiKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || '';
    
    if (!apiKey) {
      return NextResponse.json({ 
        answer: 'AI 服务尚未配置，请联系管理员。' 
      });
    }

    // 构建消息
    const messages: any[] = history || [];
    
    // 如果有图片，使用视觉模型
    if (image) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: image
            }
          },
          {
            type: 'text',
            text: question || '请描述这张图片中的内容'
          }
        ]
      });
    } else {
      messages.push({
        role: 'user',
        content: question
      });
    }

    // 选择模型（有图片用视觉模型）
    const model = image ? 'qwen-vl-max' : 'qwen3-5-flash';

    // 调用千问 API
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
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
            content: '你是一个友好的学习助手，专门帮助学生理解题目和知识点。回答要简洁明了，适合学生理解。如果涉及数学公式，请使用 LaTeX 格式。'
          },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('千问 API 错误:', errorText);
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
