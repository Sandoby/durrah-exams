// Quick verification script to check classrooms tables
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://khogxhpnuhhebkevaqlg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtob2d4aHBudWhoZWJrZXZhcWxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMzQ5NDgsImV4cCI6MjA3ODgxMDk0OH0.xacQm2Y0vuWnJALq2Bayne9c7vm72IWCVEx5-RErlMk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTables() {
  console.log('🔍 Verifying classroom tables...\n');
  
  try {
    // Try to query classrooms table
    const { data: classrooms, error: classroomsError } = await supabase
      .from('classrooms')
      .select('*')
      .limit(1);
    
    if (classroomsError) {
      console.log('❌ classrooms table:', classroomsError.message);
    } else {
      console.log('✅ classrooms table exists');
    }

    // Try to query classroom_students table
    const { data: students, error: studentsError } = await supabase
      .from('classroom_students')
      .select('*')
      .limit(1);
    
    if (studentsError) {
      console.log('❌ classroom_students table:', studentsError.message);
    } else {
      console.log('✅ classroom_students table exists');
    }

    // Try to query classroom_exams table
    const { data: exams, error: examsError } = await supabase
      .from('classroom_exams')
      .select('*')
      .limit(1);
    
    if (examsError) {
      console.log('❌ classroom_exams table:', examsError.message);
    } else {
      console.log('✅ classroom_exams table exists');
    }

    console.log('\n✨ Verification complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyTables();
