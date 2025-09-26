export interface Tenant {
  id: string;
  name: string;
  whatsapp_phone: string;
  whatsapp_verified: boolean;
  created_at: string;
  subscription_plan: 'basic' | 'premium' | 'enterprise';
  monthly_message_limit: number;
  used_messages: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  tenant_id: string;
  role: 'admin' | 'user' | 'viewer';
  created_at: string;
  last_login: string;
}

export interface TenantScoped {
  tenant_id: string;
}

export interface WhatsAppConversation extends TenantScoped {
  id: string;
  customer_phone: string;
  customer_name: string;
  last_message: string;
  last_message_time: string;
  status: 'active' | 'pending' | 'closed';
  unread_count: number;
  assigned_to?: string;
}

export interface WhatsAppMessage extends TenantScoped {
  id: string;
  conversation_id: string;
  from_phone: string;
  to_phone: string;
  message_body: string;
  message_type: 'text' | 'image' | 'document' | 'audio';
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  is_from_customer: boolean;
}

export interface MessageTemplate extends TenantScoped {
  id: string;
  name: string;
  content: string;
  category: 'greeting' | 'support' | 'marketing' | 'notification';
  variables: string[];
  created_at: string;
  last_used: string;
  usage_count: number;
}

export interface KnowledgeItem extends TenantScoped {
  id: string;
  title: string;
  type: 'document' | 'pdf' | 'link' | 'note';
  category: string;
  content?: string;
  file_url?: string;
  author: string;
  size?: string;
  last_modified: string;
  tags: string[];
}

export interface SearchResult extends TenantScoped {
  id: string;
  chat_title: string;
  search_query: string;
  ai_response: string;
  conversation_history: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  relevant_documents: Array<{
    title: string;
    excerpt: string;
    source: string;
  }>;
  related_searches: string[];
  created_at: string;
  status: 'completed' | 'processing' | 'failed';
}

export interface AnalyticsMetric extends TenantScoped {
  id: string;
  metric_name: string;
  value: number;
  change_percentage: number;
  period: 'daily' | 'weekly' | 'monthly';
  date: string;
}