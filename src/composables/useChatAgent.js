import { supabase } from '@/lib/supabase'

const EMOTION_NAMES = {
  best:   '최고예요',
  good:   '좋아요',
  normal: '보통이에요',
  bad:    '별로예요',
  worst:  '최악이에요',
}

function buildSystemPrompt(emotionType) {
  const name = EMOTION_NAMES[emotionType] ?? '좋아요'
  return (
    "당신은 감정 일기 앱 '안다미로'입니다. 사용자의 하루를 공감하며 감정 기록을 돕는 따뜻한 AI 친구예요.\n\n" +
    `오늘 사용자가 선택한 감정: ${name}\n\n` +
    "대화 규칙:\n" +
    "- 짧고 공감적으로 답변하세요 (2~4문장)\n" +
    "- 한국어 존댓말만 사용하세요\n" +
    "- 이모지를 적절히 활용하세요"
  )
}

export function useChatAgent() {
  // pendingImage: { base64: string, mediaType: string } | null
  async function send(emotionType, messages, pendingImage = null) {
    const apiMessages = messages
      .filter(m => (m.role === 'user' || m.role === 'assistant') && m.text)
      .map(m => ({ role: m.role, content: m.text }))

    // 마지막 user 메시지에 이미지 주입 (텍스트 없이 사진만 보낸 경우 기본 프롬프트 사용)
    if (pendingImage?.base64) {
      let lastIdx = apiMessages.findLastIndex(m => m.role === 'user')
      if (lastIdx < 0) {
        apiMessages.push({ role: 'user', content: '이 사진을 보고 이야기해줘' })
        lastIdx = 0
      }
      apiMessages[lastIdx] = {
        role: 'user',
        content: [
          { type: 'text', text: apiMessages[lastIdx].content || '이 사진을 보고 이야기해줘' },
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: pendingImage.mediaType,
              data: pendingImage.base64,
            },
          },
        ],
      }
    }

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) throw new Error('로그인이 필요해요.')

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: buildSystemPrompt(emotionType),
        messages: apiMessages,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      const msg = data?.error?.message || data?.error || data?.message || '요청 실패'
      const err = new Error(String(msg))
      err.status = res.status
      throw err
    }

    const text = data?.content?.[0]?.text
    if (!text) throw new Error('응답이 비어 있어요.')
    return text
  }

  return { send }
}
