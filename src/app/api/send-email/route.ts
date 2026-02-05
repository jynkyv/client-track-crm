import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: Request) {
    try {
        const { to, subject, content, attachments } = await request.json()

        if (!to || !subject || !content) {
            return NextResponse.json(
                { error: 'Missing required fields: to, subject, content' },
                { status: 400 }
            )
        }

        const user = process.env.GMAIL_USER
        const pass = process.env.GMAIL_APP_PASSWORD

        if (!user || !pass) {
            console.error('Missing GMAIL_USER or GMAIL_APP_PASSWORD env variables')
            return NextResponse.json(
                { error: 'Server configuration error: Missing email credentials' },
                { status: 500 }
            )
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user,
                pass,
            },
        })

        await transporter.sendMail({
            from: user,
            to,
            subject,
            text: content, // Plain text version
            html: content.replace(/\n/g, '<br>'), // Simple HTML conversion
            attachments: attachments?.map((att: any) => {
                if (att.url) {
                    return {
                        filename: att.filename,
                        path: att.url, // Support URL-based attachments
                    }
                } else if (att.content) {
                    return {
                        filename: att.filename,
                        content: att.content,
                        encoding: att.encoding, // Support base64 content
                    }
                }
                return { filename: att.filename }
            }),
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error sending email:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to send email' },
            { status: 500 }
        )
    }
}
