import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: Request) {
    try {
        const { to, subject, content, html, attachments } = await request.json()

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

        // 检查HTTPS_PROXY环境变量并配置代理
        const proxy = process.env.HTTPS_PROXY || process.env.https_proxy
        if (proxy) {
            console.log('Using proxy for email sending:', proxy)
            const { HttpsProxyAgent } = require('https-proxy-agent')
            const agent = new HttpsProxyAgent(proxy)
            transporter.set('oauth2_provision_cb', (user: any, renew: any, callback: any) => {
                let accessToken = user.accessToken
                if (!accessToken) {
                    return renew(callback)
                }
                callback(null, accessToken)
            })
            // @ts-ignore
            transporter.options.agent = agent
        }

        // ... 

        console.log('Preparing to send email to:', to)
        console.log('Subject:', subject)
        console.log('Attachments count:', attachments?.length || 0)

        // Log HTML content if present
        if (html) {
            console.log('HTML content length:', html.length)
        }

        const mailOptions = {
            from: user,
            to,
            subject,
            text: content,
            html: html || content.replace(/\n/g, '<br>'),
            attachments: attachments?.map((att: any) => {
                if (att.url) {
                    console.log('Processing URL attachment:', att.filename, att.url)
                    return {
                        filename: att.filename,
                        path: att.url,
                    }
                } else if (att.content) {
                    console.log('Processing content attachment:', att.filename)
                    return {
                        filename: att.filename,
                        content: att.content,
                        encoding: att.encoding,
                    }
                }
                return { filename: att.filename }
            }),
        }

        console.log('Sending mail...')
        const info = await transporter.sendMail(mailOptions)
        console.log('Mail sent successfully:', info.messageId)

        return NextResponse.json({ success: true, messageId: info.messageId })
    } catch (error: any) {
        console.error('Error sending email:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to send email' },
            { status: 500 }
        )
    }
}
