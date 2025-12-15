export const getFileUrl = (path?: string) => {
    if (!path) return ''

    // 尝试解码 URL 编码的 JSON 对象
    let url = path
    try {
        // 如果是编码的JSON格式，先解码
        const decoded = decodeURIComponent(path)
        if (decoded.startsWith('{') && decoded.includes('"url"')) {
            const parsed = JSON.parse(decoded)
            url = parsed.url || path
        }
    } catch {
        // 解析失败则使用原始值
    }

    // 如果URL本身包含序列化的JSON对象格式
    if (url.startsWith('{') && url.includes('"url"')) {
        try {
            const parsed = JSON.parse(url)
            url = parsed.url || url
        } catch {
            // 解析失败则使用原始值
        }
    }

    if (url.startsWith('http')) return url
    return `https://files.openwork.cc/${url}`
}
