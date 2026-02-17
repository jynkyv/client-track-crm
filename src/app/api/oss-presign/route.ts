import { NextRequest, NextResponse } from 'next/server'
import OSS from 'ali-oss'

export async function POST(request: NextRequest) {
    try {
        const { fileName } = await request.json()

        if (!fileName) {
            return NextResponse.json(
                { error: '未提供文件名' },
                { status: 400 }
            )
        }

        const region = process.env.OSS_REGION
        const accessKeyId = process.env.OSS_ACCESS_KEY_ID
        const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET
        const bucket = process.env.OSS_BUCKET

        if (!region || !accessKeyId || !accessKeySecret || !bucket) {
            return NextResponse.json(
                { error: '服务器OSS配置错误' },
                { status: 500 }
            )
        }

        const client = new OSS({
            region,
            accessKeyId,
            accessKeySecret,
            bucket,
            secure: true
        })

        // Generate unique object name
        const timestamp = Date.now()
        const safeName = fileName.replace(/[\\/]/g, '_')
        const objectName = `applicants/${timestamp}-${safeName}`

        // Generate presigned PUT URL (valid for 10 minutes)
        const presignedUrl = client.signatureUrl(objectName, {
            method: 'PUT',
            expires: 600,
            'Content-Type': 'application/pdf'
        })

        return NextResponse.json({
            presignedUrl,
            objectName
        })
    } catch (error) {
        console.error('生成预签名URL失败:', error)
        return NextResponse.json(
            { error: '生成预签名URL失败' },
            { status: 500 }
        )
    }
}
