import { NextRequest, NextResponse } from 'next/server'
import OSS from 'ali-oss'

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json(
                { error: '未找到文件' },
                { status: 400 }
            )
        }

        // 检查环境变量
        const region = process.env.OSS_REGION
        const accessKeyId = process.env.OSS_ACCESS_KEY_ID
        const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET
        const bucket = process.env.OSS_BUCKET

        if (!region || !accessKeyId || !accessKeySecret || !bucket) {
            console.error('OSS配置缺失')
            return NextResponse.json(
                { error: '服务器OSS配置错误' },
                { status: 500 }
            )
        }

        // 初始化OSS客户端
        const client = new OSS({
            region,
            accessKeyId,
            accessKeySecret,
            bucket,
            secure: true // 使用HTTPS
        })

        // 生成文件名：timestamp-filename
        const timestamp = Date.now()
        // 处理文件名中的特殊字符
        const safeName = file.name.replace(/[\\/]/g, '_')
        const objectName = `applicants/${timestamp}-${safeName}`

        // 将File转换为Buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // 上传到OSS
        const result = await client.put(objectName, buffer)

        // 返回文件路径，前端自行拼接域名
        const url = objectName

        return NextResponse.json({ url })
    } catch (error) {
        console.error('上传文件失败:', error)
        return NextResponse.json(
            { error: '上传文件失败' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const filepath = searchParams.get('filepath')

        if (!filepath) {
            return NextResponse.json(
                { error: '未提供文件路径' },
                { status: 400 }
            )
        }

        // 检查环境变量
        const region = process.env.OSS_REGION
        const accessKeyId = process.env.OSS_ACCESS_KEY_ID
        const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET
        const bucket = process.env.OSS_BUCKET

        if (!region || !accessKeyId || !accessKeySecret || !bucket) {
            console.error('OSS配置缺失')
            return NextResponse.json(
                { error: '服务器OSS配置错误' },
                { status: 500 }
            )
        }

        // 初始化OSS客户端
        const client = new OSS({
            region,
            accessKeyId,
            accessKeySecret,
            bucket,
            secure: true
        })

        // 删除文件
        // 移除可能存在的完整URL前缀，只保留OSS中的对象名
        // 假设 URL 格式类似 https://bucket.region.aliyuncs.com/object-name
        // 或者直接是 object-name
        let objectName = filepath
        if (filepath.startsWith('http')) {
            try {
                const urlObj = new URL(filepath)
                objectName = urlObj.pathname.substring(1) // 去掉开头的 /
            } catch (e) {
                console.error('解析文件URL失败', e)
                // 如果解析失败，尝试直接使用filepath
            }
        }

        await client.delete(objectName)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('删除文件失败:', error)
        return NextResponse.json(
            { error: '删除文件失败' },
            { status: 500 }
        )
    }
}
