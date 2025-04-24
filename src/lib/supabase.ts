import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

export const createFilteredQuery = (table: string, companyId: number) => {
  const needsCompanyFilter = ['motorista', 'cliente', 'checklist', 'hodometro'].includes(table);
  
  const addCompanyFilter = (query: any) => {
    return needsCompanyFilter ? query.eq('company_id', companyId) : query;
  };

  return {
    select: (columns: string = '*') => {
      return addCompanyFilter(supabase.from(table).select(columns));
    },
    
    insert: (data: any) => {
      const insertData = needsCompanyFilter ? { ...data, company_id: companyId } : data;
      return supabase.from(table).insert(insertData);
    },
    
    update: (data: any) => {
      let query = supabase.from(table).update(data);
      return addCompanyFilter(query);
    },
    
    delete: () => {
      let query = supabase.from(table).delete();
      return addCompanyFilter(query);
    }
  };
};