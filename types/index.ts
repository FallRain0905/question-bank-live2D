// 数据库类型定义

export interface Question {
  id: string;
  user_id: string;
  question_text: string | null;
  question_image_url: string | null;
  answer_text: string | null;
  answer_image_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface QuestionWithTags extends Question {
  tags: Tag[];
  user_email?: string;
  user_name?: string;
  is_favorited?: boolean;
  favorites_count?: number;
}

export interface Tag {
  id: number;
  name: string;
  created_at?: string;
}

export interface NewQuestion {
  question_text?: string;
  question_image?: File;
  answer_text?: string;
  answer_image?: File;
  tags: string[];
}

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  display_name?: string;
  is_admin?: boolean;
}

// 笔记相关类型
export interface Note {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  tags_id: UUID[] | null;
  status: 'pending' | 'approved' | 'rejected';
  likes_count: number;
  created_at: string;
  updated_at: string;
}

export interface NoteWithTags extends Note {
  tags: Tag[];
  user_email?: string;
  user_name?: string;
  is_liked?: boolean;
  is_favorited?: boolean;
  favorites_count?: number;
}

export interface NewNote {
  title: string;
  description?: string;
  file?: File;
  tags: string[];
}

export interface Like {
  id: string;
  user_id: string;
  note_id: string;
  created_at: string;
}

// UUID 类型
export type UUID = string;

// 评论相关类型
export interface Comment {
  id: string;
  user_id: string;
  target_type: 'question' | 'note';
  target_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommentWithUser extends Comment {
  user: {
    id: string;
    username?: string;
    email: string;
  };
  replies?: CommentWithUser[];
}

// 收藏相关类型
export interface Favorite {
  id: string;
  user_id: string;
  target_type: 'question' | 'note';
  target_id: string;
  created_at: string;
}

// 通知相关类型
export interface Notification {
  id: string;
  user_id: string;
  type: 'comment' | 'reply' | 'like' | 'follow' | 'approve';
  title: string;
  content: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

// 关注相关类型
export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

// 搜索历史类型
export interface SearchHistory {
  id: string;
  user_id: string;
  query: string;
  created_at: string;
}
