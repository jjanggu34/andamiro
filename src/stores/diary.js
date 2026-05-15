import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './auth'


export const useDiaryStore = defineStore('diary', () => {
  const diaries = ref([])

  function userId() {
    return useAuthStore().user?.id
  }

  async function fetchByMonth(yearMonth) {
    const uid = userId()
    if (!uid) return
    const [y, m] = yearMonth.split('-')
    const from = `${y}-${m}-01`
    const to   = `${y}-${m}-${new Date(y, m, 0).getDate()}`
    const { data } = await supabase
      .from('emotion_records')
      .select('*')
      .eq('user_id', uid)
      .gte('record_date', from)
      .lte('record_date', to)
      .order('record_date', { ascending: false })
    diaries.value = data ?? []
  }

  async function getByDate(date) {
    const uid = userId()
    if (!uid) return null
    const { data } = await supabase
      .from('emotion_records')
      .select('*')
      .eq('user_id', uid)
      .eq('record_date', date)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data ?? null
  }

  async function save(payload) {
    const uid = userId()
    if (!uid) throw new Error('not_authenticated')

    const { date, emotion, content, summary, chat_messages } = payload

    const insertPromise = supabase
      .from('emotion_records')
      .upsert({
        user_id:       uid,
        record_date:   date,
        emotion,
        content,
        result:        summary ?? (content ?? '').slice(0, 2000),
        chat_messages: chat_messages ?? [],
      }, { onConflict: 'user_id,record_date' })

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('저장 시간이 초과됐어요. 네트워크를 확인해 주세요.')), 10000)
    )

    const { error } = await Promise.race([insertPromise, timeout])
    if (error) throw error
  }

  async function updateResult(id, result) {
    await supabase
      .from('emotion_records')
      .update({ result })
      .eq('id', id)
  }

  return { diaries, fetchByMonth, getByDate, save, updateResult }
})
