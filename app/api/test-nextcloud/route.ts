import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { url, user, password } = await request.json();

        if (!url || !user || !password) {
            return NextResponse.json(
                { success: false, error: '缺少必需的参数' },
                { status: 400 }
            );
        }

        // 测试 Nextcloud 连接
        try {
            const response = await fetch(`${url}/remote.php/dav/files/${user}/`, {
                method: 'PROPFIND',
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`,
                    'Depth': '0'
                }
            });

            if (response.ok || response.status === 207) {
                return NextResponse.json({ success: true });
            } else {
                return NextResponse.json(
                    { success: false, error: '认证失败或服务器不可达' },
                    { status: response.status }
                );
            }
        } catch (error) {
            return NextResponse.json(
                { success: false, error: '网络连接失败' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('测试 Nextcloud 连接失败:', error);
        return NextResponse.json(
            { success: false, error: '服务器错误' },
            { status: 500 }
        );
    }
}