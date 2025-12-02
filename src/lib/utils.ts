export const getFileUrl = (path?: string) => {
    if (!path) return ''
    if (path.startsWith('http')) return path
    return `https://files.openwork.cc/${path}`
}
