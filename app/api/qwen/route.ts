import { NextRequest, NextResponse } from 'next/server';

const DASHSCOPE_API_KEY = 'sk-7abb0f55e21e4a7390c74c3763c604cb';

// 千问API兼容模式endpoint
const API_ENDPOINT = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

export async function POST(req: NextRequest) {
  console.log('=== 千问API 请求开始 ===');

  try {
    const body = await req.json();
    console.log('请求体:', JSON.stringify(body));

    const { messages, model = 'qwen-plus', temperature = 0.7 } = body;

    if (!messages || !Array.isArray(messages)) {
      console.error('❌ 消息格式无效');
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    // 检查是否有图片
    const hasImage = messages.some(m => m.image);
    console.log('检测到图片消息:', hasImage ? '是' : '否');

    // 转换为千问API格式
    const apiMessages = messages.map((m: any) => {
      const hasMessageImage = !!m.image;

      // 如果消息有图片，使用OpenAI兼容格式（content为数组）
      if (hasMessageImage) {
        console.log('转换图片消息:', m.image.substring(0, 50) + '...');
        return {
          role: m.role,
          content: [
            {
              type: 'image_url',
              image_url: {
                url: m.image,
              },
            },
            ...(m.content ? [{
              type: 'text',
              text: m.content,
            }] : []),
          ],
        };
      }

      // 纯文本消息
      return {
        role: m.role,
        content: m.content || '',
      };
    });

    console.log('发送到千问API的消息数:', apiMessages.length);
    console.log('请求URL:', API_ENDPOINT);
    console.log('使用模型:', model);

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
      },
      body: JSON.stringify({
        model: model,
        messages: apiMessages,
        temperature,
      }),
    });

    console.log('响应状态:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 千问API 错误响应:', errorText);

      let errorMessage = 'API request failed';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
        console.error('错误详情:', errorData);
      } catch {
        console.error('解析错误响应失败');
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const responseText = await response.text();
    console.log('=== 千问API 响应 ===');
    console.log('原始响应:', responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      console.error('解析JSON失败:', responseText);
      responseData = {};
    }

    console.log('解析后的数据:', JSON.stringify(responseData));

    // 千问API返回格式: { choices: [{ message: { content: string, image?: string } }]
    const assistantContent = responseData.choices?.[0]?.message?.content || '抱歉，我无法回答这个问题。';
    const assistantImage = responseData.choices?.[0]?.message?.image;

    console.log('助手内容:', assistantContent?.substring(0, 100));
    console.log('是否有图片返回:', assistantImage ? '是' : '否');

    // 转换为前端格式
    return NextResponse.json({
      content: assistantContent,
      ...(assistantImage ? { image: assistantImage } : {}),
    });
  } catch (error) {
    console.error('=== 千问API 调用失败 ===');
    console.error('错误类型:', error.constructor.name);
    console.error('错误信息:', error.message);
    console.error('错误堆栈:', error.stack);

    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
