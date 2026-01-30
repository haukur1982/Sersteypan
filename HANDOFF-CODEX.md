# CODEX: Sprint 4 Task
**Date:** Jan 30, 2026 | **Time:** 30 min

## Your Mission
Create email notification templates and Edge Function for sending emails.

## Why
Production alerts, delivery notifications, and message alerts need email delivery.

## Tasks

### 1. Create Email Notification Edge Function (25 min)
Location: `supabase/functions/send-notification/index.ts`

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

interface EmailRequest {
  type: 'delivery_scheduled' | 'element_ready' | 'message_received'
  recipientEmail: string
  recipientName: string
  data: Record<string, unknown>
}

const templates = {
  delivery_scheduled: {
    subject: 'Afhending áætluð - {projectName}',
    body: `Halló {recipientName},

Afhending hefur verið áætluð fyrir verkefnið {projectName}.
Áætluð dagsetning: {date}

Kveðja,
Sérsteypan`
  },
  element_ready: {
    subject: 'Eining tilbúin - {elementName}',
    body: `Halló {recipientName},

Einingin {elementName} er tilbúin til afhendingar.
Verkefni: {projectName}

Kveðja,
Sérsteypan`
  },
  message_received: {
    subject: 'Ný skilaboð - Sérsteypan',
    body: `Halló {recipientName},

Þú hefur fengið ný skilaboð í Sérsteypan kerfinu.
Frá: {senderName}

Innskráðu þig til að skoða skilaboðin.

Kveðja,
Sérsteypan`
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { type, recipientEmail, recipientName, data }: EmailRequest = await req.json()

    const template = templates[type]
    if (!template) {
      return new Response(JSON.stringify({ error: 'Unknown template' }), { status: 400 })
    }

    // Replace placeholders in template
    let subject = template.subject
    let body = template.body
    for (const [key, value] of Object.entries({ ...data, recipientName })) {
      subject = subject.replace(new RegExp(`{${key}}`, 'g'), String(value))
      body = body.replace(new RegExp(`{${key}}`, 'g'), String(value))
    }

    // Send via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Sérsteypan <noreply@sersteypan.is>',
        to: recipientEmail,
        subject,
        text: body
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Resend error:', error)
      return new Response(JSON.stringify({ error: 'Failed to send email' }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('Notification error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 })
  }
})
```

### 2. Create deno.json for the function (2 min)
```json
{
  "name": "send-notification",
  "version": "1.0.0"
}
```

### 3. Commit and push (3 min)
```bash
git add -A && git commit -m "Add: Email notification Edge Function with templates" && git push origin main
```

## Environment Variables Needed
```
RESEND_API_KEY (set via supabase secrets set RESEND_API_KEY=...)
```

## Success Criteria
- [ ] send-notification function created
- [ ] Templates for 3 email types
- [ ] Icelandic language content
- [ ] Commit and push

## When Done
Report: "Email notification Edge Function created with 3 templates. Pushed to main."
