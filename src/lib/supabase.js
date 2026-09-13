import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://jlfmvksgezunzqshabxu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsZm12a3NnZXp1bnpxc2hhYnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyODY1NjAsImV4cCI6MjEwNDg2MjU2MH0.P6HV1O0H4Vrx2Feyn39LFY7g1eMGQirwaKFy3g-7AEg'
)