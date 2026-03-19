import { NextRequest, NextResponse } from 'next/server';

const NEXTCLOUD_URL = process.env.NEXTCLOUD_URL || 'http://82.156.44.197:8084';
const NEXTCLOUD_USER = process.env.NEXTCLOUD_USER || 'admin';
const NEXTCLOUD_PASSWORD = process.env.NEXTCLOUD_PASSWORD || 'z7OCvZ089VNvNodaZApCAvvzB8N6kV6iBKarNo1V4gx1NeEGa3uHJUHwTlmBvJWfTxpFls07';
const NEXTCLOUD_PUBLIC_URL = process.env.NEXTCLOUD_PUBLIC_URL || 'http://82.156.44.197:8084';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(req: NextRequest) {
  console.log('>>> 上传背景图片到 Nextcloud...');

  try {
    // 检查 Content-Type
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { success: false, error: '请求格式错误，需要 multipart/form-data' },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const path = formData.get('path') as string || '背景图片';

    if (!file) {
      return NextResponse.json(
        { success: false, error: '没有选择文件' },
        { status: 400 }
      );
    }

    // 生成文件名
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `background-${timestamp}.${ext}`;
    const fullPath = `睦与秋雨的共享/${path}/${fileName}`;

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('文件信息:', { fileName, size: buffer.length, type: file.type });

    // 上传到 Nextcloud
    const uploadUrl = `${NEXTCLOUD_URL}/remote.php/webdav/${fullPath.split('/').map(encodeURIComponent).join('/')}`;
    
    console.log('上传 URL:', uploadUrl);

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${NEXTCLOUD_USER}:${NEXTCLOUD_PASSWORD}`).toString('base64'),
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: buffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Nextcloud 上传失败:', response.status, errorText);
      return NextResponse.json(
        { success: false, error: `Nextcloud 上传失败: ${response.status}` },
        { status: 500 }
      );
    }

    // 创建公开分享链接
    let publicUrl = `${NEXTCLOUD_PUBLIC_URL}/remote.php/webdav/${fullPath.split('/').map(encodeURIComponent).join('/')}`;

    try {
      const shareResponse = await fetch(`${NEXTCLOUD_URL}/ocs/v2.php/apps/files_sharing/api/v1/shares`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${NEXTCLOUD_USER}:${NEXTCLOUD_PASSWORD}`).toString('base64'),
          'OCS-APIRequest': 'true',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `path=${encodeURIComponent(fullPath)}&shareType=3&publicUpload=false`,
      });

      if (shareResponse.ok) {
        const shareData = await shareResponse.text();
        const tokenMatch = shareData.match(/<token>([^<]+)<\/token>/);
        if (tokenMatch) {
          publicUrl = `${NEXTCLOUD_PUBLIC_URL}/s/${tokenMatch[1]}/download`;
        }
      }
    } catch (shareError) {
      console.warn('创建分享链接失败，使用直接 URL:', shareError);
    }

    console.log('上传成功! 公开 URL:', publicUrl);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
      path: fullPath,
    });

  } catch (error: any) {
    console.error('上传失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '未知错误' },
      { status: 500 }
    );
  }
}
