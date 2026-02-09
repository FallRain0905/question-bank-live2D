// 自动生成的 Supabase 数据库类型
// 你可以通过 Supabase 控制台生成完整的类型定义

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      questions: {
        Row: {
          id: string
          user_id: string
          question_text: string | null
          question_image_url: string | null
          answer_text: string | null
          answer_image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          question_text?: string | null
          question_image_url?: string | null
          answer_text?: string | null
          answer_image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          question_text?: string | null
          question_image_url?: string | null
          answer_text?: string | null
          answer_image_url?: string | null
          created_at?: string
        }
      }
      tags: {
        Row: {
          id: number
          name: string
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          created_at?: string
        }
      }
      question_tags: {
        Row: {
          question_id: string
          tag_id: number
        }
        Insert: {
          question_id: string
          tag_id: number
        }
        Update: {
          question_id?: string
          tag_id?: number
        }
      }
    }
  }
}
