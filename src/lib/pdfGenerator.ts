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
    // Swapped per user request: Use first_training_at here
    if (company.first_training_at) {
        const date = dayjs(company.first_training_at)
        // Previous refined: x: 400, y: 760
        // New: x: 425 (+25), y: 755 (-5) -> User changed to 656
        firstPage.drawText(`${date.year()}`, { x: 422, y: 656, size: fontSize, font: customFont, color })
        firstPage.drawText(`${date.month() + 1}`, { x: 472, y: 656, size: fontSize, font: customFont, color })
        firstPage.drawText(`${date.date()}`, { x: 505, y: 656, size: fontSize, font: customFont, color })
    }

    // 2. Company Name - Move Down More
    // Previous refined: y: 430. Move Down more (-20) -> 410
    firstPage.drawText(company.name || '', { x: 200, y: 420, size: fontSize, font: customFont, color })

    // 3. Representative - No Change from previous step
    // Previous refined: y: 380
    firstPage.drawText(company.representative || '', { x: 200, y: 375, size: fontSize, font: customFont, color })

    // 4. Creation Date (was First Training Date) - No Change from previous step
    // Swapped per user request: Use created_at here
    // Previous refined: y: 330
    if (company.created_at) {
        const trainDate = dayjs(company.created_at)
        const dateStr = `${trainDate.year()}年 ${trainDate.month() + 1}月 ${trainDate.date()}日`
        firstPage.drawText(dateStr, { x: 200, y: 330, size: fontSize, font: customFont, color })
    }

    const pdfBytes = await pdfDoc.save()
    return pdfBytes
}

export async function generateTechnicalInternTrainingProgramAgreement(company: Company): Promise<Uint8Array> {
    // Select template based on company name length
    // <= 10 characters: technical_intern_agreement_template.pdf
    // > 10 characters: technical_intern_agreement_template2.pdf
    const templateName = (company.name && company.name.length > 10)
        ? 'technical_intern_agreement_template2.pdf'
        : 'technical_intern_agreement_template.pdf'

    const templateBytes = await fetch(`/pdf/${templateName}`).then(res => {
        if (!res.ok) {
            // Fallback to union join template if new one is missing, to prevent crash during dev
            console.warn(`Agreement template ${templateName} not found, using fallback`)
            return fetch('/pdf/union_join_template.pdf').then(r => r.arrayBuffer())
        }
        return res.arrayBuffer()
    })
    const pdfDoc = await PDFDocument.load(templateBytes)

    pdfDoc.registerFontkit(fontkit)

    let customFont
    try {
        const fontBytes = await fetch('/fonts/MS%20Mincho.ttf').then(res => {
            if (!res.ok) throw new Error(`Font fetch failed: ${res.statusText}`)
            return res.arrayBuffer()
        })
        customFont = await pdfDoc.embedFont(fontBytes)
    } catch (e) {
        console.error('Font loading error:', e)
        throw new Error('无法加载中文字体文件 (MS Mincho.ttf)')
    }

    const pages = pdfDoc.getPages()
    const color = rgb(0, 0, 0)

    // Page 2 (index 1): Company Name at Top
    if (pages.length > 1) {
        const page2 = pages[1]
        // Estimate coordinates: Top left-ish
        // Assuming standard A4 (595 x 842), Top would be y ~750-800
        // User said "Top", let's try 780. X coordinate depends on layout, try 100 or center.
        // Let's assume there is a specific line for it.
        // Warn: These are estimates.
        page2.drawText(company.name || '', { x: 90, y: 657, size: 12, font: customFont, color })
    }

    // Page 8 (index 7): Date at Bottom
    // User said: "Date when client became training status" (first_training_at)
    if (pages.length > 7 && company.first_training_at) {
        const page8 = pages[7]
        const trainDate = dayjs(company.first_training_at)
        // Split into Year, Month, Day (Template has labels)
        // Using similar spacing to the top date: Year +50 -> Month +33 -> Day
        // Base X estimate: 400.
        // Year: 400, Month: 450, Day: 483
        const year = `${trainDate.year()}`
        const month = `${trainDate.month() + 1}`
        const day = `${trainDate.date()}`

        page8.drawText(year, { x: 395, y: 405, size: 12, font: customFont, color })
        page8.drawText(month, { x: 450, y: 405, size: 12, font: customFont, color })
        page8.drawText(day, { x: 485, y: 405, size: 12, font: customFont, color })
    }

    return await pdfDoc.save()
}
