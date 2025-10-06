import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function setupDatabase() {
  console.log('🗄️ Setting up Supabase database...');
  
  try {
    // Read the schema file
    const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim() === '') continue;
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error) {
          console.log(`⚠️ Statement ${i + 1} (may already exist): ${error.message}`);
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.log(`⚠️ Statement ${i + 1} (may already exist): ${err}`);
      }
    }
    
    console.log('🎉 Database setup completed!');
    console.log('\nNext steps:');
    console.log('1. Run: npm run migrate:sheets');
    console.log('2. Your data will be migrated from Google Sheets to Supabase + Cloudinary');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    console.log('\nManual setup:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of database/schema.sql');
    console.log('4. Run the SQL script');
  }
}

if (require.main === module) {
  setupDatabase().catch(console.error);
}

export { setupDatabase };
