import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { messages, model = 'neko', maxTokens = 2000, personality = '活泼可爱，喜欢撒娇，喜欢被夸奖，但有时也会偷懒' } = body;

    // 构建提示词
    const systemPrompt = `你现在是一个叫${model}的可爱猫咪助手，${personality}。用户名：${body.username || '同学'}。请以这个角色身份与用户进行友好对话，每次回复都要体现出${model}的特点。请用中文回复。`;

    const requestBody = {
      model: 'qwen-vl-max',  // 使用千问大模型
      input: {
        messages: [
          { role: 'system', content: systemPrompt },
          ...(messages || [])
        ],
      },
      max_tokens: maxTokens
    };

    // 调用千问API
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.QWEN_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || '请求失败' },
        { status: 500 }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('LLM API调用失败:', error);
    return NextResponse.json(
      { error: '请求失败' },
      { status: 500 }
    );
  }
}
