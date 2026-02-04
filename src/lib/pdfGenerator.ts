import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import dayjs from 'dayjs'
import { Company } from './supabase'

export async function generateUnionJoinApplication(company: Company): Promise<Uint8Array> {
    const templateBytes = await fetch('/pdf/union_join_template.pdf').then(res => res.arrayBuffer())
    const pdfDoc = await PDFDocument.load(templateBytes)

    // Register fontkit
    pdfDoc.registerFontkit(fontkit)

    // Load custom font for Chinese support
    // Ensure this file exists in public/fonts/
    // You can download Noto Sans SC or similar and rename it
    let customFont
    try {
        // Use encoded space for the URL
        const fontBytes = await fetch('/fonts/MS%20Mincho.ttf').then(res => {
            if (!res.ok) throw new Error(`Font fetch failed: ${res.statusText}`)
            return res.arrayBuffer()
        })
        customFont = await pdfDoc.embedFont(fontBytes)
    } catch (e) {
        console.error('Font loading error:', e)
        throw new Error('无法加载中文字体文件 (MS Mincho.ttf)。请确保文件存在于 public/fonts/ 目录下。错误信息: ' + (e as Error).message)
    }

    const pages = pdfDoc.getPages()
    const firstPage = pages[0]
    const { width, height } = firstPage.getSize()

    const fontSize = 12
    const color = rgb(0, 0, 0)

    // Coordinate mapping (Approximate based on user description/template)
    // 1. Creation Date (Top Right?) - User said "1号填写企业在系统中创建的日期"
    // Need to adjust coordinates based on the actual template.
    // Assuming the user will help adjust or I used a placeholder position.
    // Using some standard positions for now, can be tweaked.

    // 1. Date (Year Month Day) - Top Right
    // 1. Creation Date (Date/Month/Day) - Move Left and Up
    if (company.created_at) {
        const date = dayjs(company.created_at)
        // Previous: x: 450, y: 750. Move Left (-50) and Up (+10)
        firstPage.drawText(`${date.year()}`, { x: 400, y: 760, size: fontSize, font: customFont, color })
        firstPage.drawText(`${date.month() + 1}`, { x: 450, y: 760, size: fontSize, font: customFont, color })
        firstPage.drawText(`${date.date()}`, { x: 490, y: 760, size: fontSize, font: customFont, color })
    }

    // 2. Company Name - Move Down
    // Previous: y: 450. Move Down (-20)
    firstPage.drawText(company.name || '', { x: 200, y: 430, size: fontSize, font: customFont, color })

    // 3. Representative - Move Down
    // Previous: y: 400. Move Down (-20)
    firstPage.drawText(company.representative || '', { x: 200, y: 380, size: fontSize, font: customFont, color })

    // 4. First Training Date - Move Down
    // Previous: y: 350. Move Down (-20)
    if (company.first_training_at) {
        const trainDate = dayjs(company.first_training_at)
        const dateStr = `${trainDate.year()}年 ${trainDate.month() + 1}月 ${trainDate.date()}日`
        firstPage.drawText(dateStr, { x: 200, y: 330, size: fontSize, font: customFont, color })
    }

    const pdfBytes = await pdfDoc.save()
    return pdfBytes
}
