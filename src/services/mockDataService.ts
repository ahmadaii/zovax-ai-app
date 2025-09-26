import { 
  Tenant, 
  User, 
  WhatsAppConversation, 
  WhatsAppMessage, 
  MessageTemplate, 
  KnowledgeItem, 
  SearchResult, 
  AnalyticsMetric 
} from '@/types/tenant';

// Mock companies for demo
const mockCompanies = [
  { name: 'TechCorp Solutions', phone: '+1-555-0101' },
  { name: 'Global Consulting', phone: '+1-555-0102' },
  { name: 'Innovation Labs', phone: '+1-555-0103' },
  { name: 'Digital Dynamics', phone: '+1-555-0104' },
  { name: 'Future Systems', phone: '+1-555-0105' },
];

// Mock users database
const mockUsers: Array<{ email: string; password: string; user: User; tenant: Tenant }> = [];

// Initialize with demo data
mockCompanies.forEach((company, index) => {
  const tenantId = `tenant_${index + 1}`;
  const userId = `user_${index + 1}`;
  
  const tenant: Tenant = {
    id: tenantId,
    name: company.name,
    whatsapp_phone: company.phone,
    whatsapp_verified: true,
    created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    subscription_plan: ['basic', 'premium', 'enterprise'][Math.floor(Math.random() * 3)] as any,
    monthly_message_limit: [1000, 5000, 10000][Math.floor(Math.random() * 3)],
    used_messages: Math.floor(Math.random() * 500),
  };

  const user: User = {
    id: userId,
    name: `Admin User ${index + 1}`,
    email: `admin@${company.name.toLowerCase().replace(/\s+/g, '')}.com`,
    tenant_id: tenantId,
    role: 'admin',
    created_at: tenant.created_at,
    last_login: new Date().toISOString(),
  };

  mockUsers.push({
    email: user.email,
    password: 'password123',
    user,
    tenant,
  });
});

class MockDataService {
  private delay(ms: number = 1000): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async authenticate(email: string, password: string): Promise<{
    success: boolean;
    user?: User;
    tenant?: Tenant;
    error?: string;
  }> {
    await this.delay(800);

    const userData = mockUsers.find(u => u.email === email && u.password === password);
    
    if (userData) {
      return {
        success: true,
        user: { ...userData.user, last_login: new Date().toISOString() },
        tenant: userData.tenant,
      };
    }

    return {
      success: false,
      error: 'Invalid email or password',
    };
  }

  async register(
    name: string,
    email: string,
    password: string,
    companyName: string,
    whatsappPhone: string
  ): Promise<{
    success: boolean;
    user?: User;
    tenant?: Tenant;
    error?: string;
  }> {
    await this.delay(1200);

    // Check if email already exists
    if (mockUsers.find(u => u.email === email)) {
      return {
        success: false,
        error: 'Email already exists',
      };
    }

    const tenantId = `tenant_${Date.now()}`;
    const userId = `user_${Date.now()}`;

    const tenant: Tenant = {
      id: tenantId,
      name: companyName,
      whatsapp_phone: whatsappPhone,
      whatsapp_verified: false,
      created_at: new Date().toISOString(),
      subscription_plan: 'basic',
      monthly_message_limit: 1000,
      used_messages: 0,
    };

    const user: User = {
      id: userId,
      name,
      email,
      tenant_id: tenantId,
      role: 'admin',
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
    };

    mockUsers.push({ email, password, user, tenant });

    return {
      success: true,
      user,
      tenant,
    };
  }

  // Generate mock WhatsApp conversations for a tenant
  generateWhatsAppConversations(tenantId: string): WhatsAppConversation[] {
    const customerNames = ['John Smith', 'Maria Garcia', 'David Johnson', 'Sarah Williams', 'Michael Brown'];
    const statuses: Array<'active' | 'pending' | 'closed'> = ['active', 'pending', 'closed'];
    
    return Array.from({ length: 8 }, (_, i) => ({
      id: `conv_${tenantId}_${i + 1}`,
      tenant_id: tenantId,
      customer_phone: `+1-555-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      customer_name: customerNames[i % customerNames.length],
      last_message: [
        'Hello, I need help with my order',
        'Thank you for the quick response!',
        'Can you please send me the tracking info?',
        'I want to make a complaint',
        'Great service, thanks!',
        'When will my package arrive?',
        'I need to cancel my order',
        'Can I get a refund?'
      ][i],
      last_message_time: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      unread_count: Math.floor(Math.random() * 5),
      assigned_to: Math.random() > 0.3 ? 'Agent Smith' : undefined,
    }));
  }

  // Generate mock message templates for a tenant
  generateMessageTemplates(tenantId: string): MessageTemplate[] {
    return [
      {
        id: `template_${tenantId}_1`,
        tenant_id: tenantId,
        name: 'Welcome Message',
        content: 'Hello {{customer_name}}, welcome to {{company_name}}! How can we help you today?',
        category: 'greeting',
        variables: ['customer_name', 'company_name'],
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        last_used: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        usage_count: 45,
      },
      {
        id: `template_${tenantId}_2`,
        tenant_id: tenantId,
        name: 'Order Confirmation',
        content: 'Your order #{{order_id}} has been confirmed! Estimated delivery: {{delivery_date}}',
        category: 'notification',
        variables: ['order_id', 'delivery_date'],
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        last_used: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        usage_count: 123,
      },
      {
        id: `template_${tenantId}_3`,
        tenant_id: tenantId,
        name: 'Support Resolution',
        content: 'Hi {{customer_name}}, we have resolved your issue. Is there anything else we can help you with?',
        category: 'support',
        variables: ['customer_name'],
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        last_used: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        usage_count: 67,
      },
    ];
  }

  // Generate mock knowledge base items for a tenant
  generateKnowledgeBase(tenantId: string): KnowledgeItem[] {
    const categories = ['Customer Service', 'Product Info', 'Policies', 'Technical', 'Marketing'];
    
    return Array.from({ length: 12 }, (_, i) => ({
      id: `kb_${tenantId}_${i + 1}`,
      tenant_id: tenantId,
      title: [
        'Customer Service Guidelines',
        'Product FAQ Document',
        'Return Policy',
        'WhatsApp Integration Guide',
        'Marketing Templates',
        'Troubleshooting Guide',
        'Sales Process',
        'Contact Information',
        'Privacy Policy',
        'Terms of Service',
        'Product Catalog',
        'Training Manual'
      ][i],
      type: ['document', 'pdf', 'link', 'note'][Math.floor(Math.random() * 4)] as any,
      category: categories[Math.floor(Math.random() * categories.length)],
      author: ['John Admin', 'Sarah Manager', 'Mike Support'][Math.floor(Math.random() * 3)],
      size: `${Math.floor(Math.random() * 500) + 50} KB`,
      last_modified: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['important', 'reference', 'policy', 'guide'].slice(0, Math.floor(Math.random() * 3) + 1),
    }));
  }

  // Generate mock search results for a tenant
  generateSearchResults(tenantId: string): SearchResult[] {
    return Array.from({ length: 6 }, (_, i) => ({
      id: `search_${tenantId}_${i + 1}`,
      tenant_id: tenantId,
      chat_title: [
        'Customer Inquiry - Product Info',
        'Support Request - Order Issue',
        'General Question - Shipping',
        'Complaint Resolution',
        'Product Recommendation',
        'Technical Support'
      ][i],
      search_query: [
        'What are the product specifications?',
        'How to handle order cancellations?',
        'Shipping times to international locations',
        'Refund process for damaged items',
        'Best products for small businesses',
        'WhatsApp integration troubleshooting'
      ][i],
      ai_response: `This is a comprehensive AI response for the query. The system has analyzed the knowledge base and provided relevant information based on the company's policies and procedures.`,
      conversation_history: [
        {
          role: 'user',
          content: [
            'What are the product specifications?',
            'How to handle order cancellations?',
            'Shipping times to international locations',
            'Refund process for damaged items',
            'Best products for small businesses',
            'WhatsApp integration troubleshooting'
          ][i],
          timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          role: 'assistant',
          content: 'Based on your knowledge base, here is the relevant information...',
          timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
      relevant_documents: [
        { title: 'Product Catalog', excerpt: 'Detailed specifications...', source: 'Knowledge Base' },
        { title: 'Customer Guide', excerpt: 'Step by step process...', source: 'Documentation' },
      ],
      related_searches: ['related query 1', 'related query 2'],
      created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'completed',
    }));
  }

  // Get tenant-scoped data
  async getTenantData(tenantId: string) {
    await this.delay(500);
    
    return {
      conversations: this.generateWhatsAppConversations(tenantId),
      templates: this.generateMessageTemplates(tenantId),
      knowledgeBase: this.generateKnowledgeBase(tenantId),
      searchResults: this.generateSearchResults(tenantId),
    };
  }
}

export const mockDataService = new MockDataService();