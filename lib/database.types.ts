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
          class_id: string | null
          question_file_url: string | null
          question_file_name: string | null
          question_file_type: string | null
          question_file_size: number | null
          answer_file_url: string | null
          answer_file_name: string | null
          answer_file_type: string | null
          answer_file_size: number | null
        }
        Insert: {
          id?: string
          user_id: string
          question_text?: string | null
          question_image_url?: string | null
          answer_text?: string | null
          answer_image_url?: string | null
          created_at?: string
          class_id?: string | null
          question_file_url?: string | null
          question_file_name?: string | null
          question_file_type?: string | null
          question_file_size?: number | null
          answer_file_url?: string | null
          answer_file_name?: string | null
          answer_file_type?: string | null
          answer_file_size?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          question_text?: string | null
          question_image_url?: string | null
          answer_text?: string | null
          answer_image_url?: string | null
          created_at?: string
          class_id?: string | null
          question_file_url?: string | null
          question_file_name?: string | null
          question_file_type?: string | null
          question_file_size?: number | null
          answer_file_url?: string | null
          answer_file_name?: string | null
          answer_file_type?: string | null
          answer_file_size?: number | null
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
      classes: {
        Row: {
          id: string
          name: string
          description: string | null
          invite_code: string
          creator_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          invite_code?: string
          creator_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          invite_code?: string
          creator_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      class_members: {
        Row: {
          id: string
          class_id: string
          user_id: string
          role: string
          joined_at: string
        }
        Insert: {
          id?: string
          class_id: string
          user_id: string
          role?: string
          joined_at?: string
        }
        Update: {
          id?: string
          class_id?: string
          user_id?: string
          role?: string
          joined_at?: string
        }
      }
      notes: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string | null
          image_url: string | null
          tags: string[] | null
          class_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content?: string | null
          image_url?: string | null
          tags?: string[] | null
          class_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string | null
          image_url?: string | null
          tags?: string[] | null
          class_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
