import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { question, history, image, systemPrompt, llmConfig } = await req.json();

    if (!question && !image) {
      return NextResponse.json({ answer: '请输入问题或上传图片' });
    }

    // 如果没有提供LLM配置，使用默认配置
    const apiKey = llmConfig?.apiKey || process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || '';
    const apiUrl = llmConfig?.apiUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
    const model = llmConfig?.model || (image ? 'qwen-vl-max' : 'qwen-plus');
    const temperature = llmConfig?.temperature || 0.7;
    const maxTokens = llmConfig?.maxTokens || 1000;

    console.log('LLM配置:', { model, temperature, maxTokens, hasApiKey: !!apiKey });

    if (!apiKey) {
      return NextResponse.json({
        answer: 'AI 服务尚未配置，请联系管理员或配置自定义模型。'
      });
    }

    // 构建消息
    const messages: any[] = [];

    // 添加系统提示词
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // 添加历史消息
    if (history && history.length > 0) {
      messages.push(...history);
    }

    // 添加当前用户消息
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

    // 调用LLM API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LLM API 错误:', errorText);

      try {
        const errorData = JSON.parse(errorText);
        return NextResponse.json({
          answer: `AI 服务错误: ${errorData.error?.message || errorData.message || '未知错误'}`
        });
      } catch {
        return NextResponse.json({
          answer: 'AI 服务暂时不可用，请稍后再试。'
        });
      }
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
