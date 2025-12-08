-- Create feedbacks table for applicant feedback system
-- Japanese employees submit feedback, Chinese employees (applicant creators) process it

-- Create feedbacks table
CREATE TABLE IF NOT EXISTS feedbacks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    applicant_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    submitter_id UUID NOT NULL,  -- Japanese employee who submitted
    handler_id UUID NOT NULL,    -- Chinese employee (applicant creator) who handles
    fields TEXT[] NOT NULL,      -- Selected fields like ['real_name', 'passport']
    content TEXT NOT NULL,       -- Feedback content
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
    reject_reason TEXT,          -- Reason for rejection (if rejected)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_feedbacks_submitter ON feedbacks(submitter_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_handler ON feedbacks(handler_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_applicant ON feedbacks(applicant_id);

-- Enable RLS
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "feedbacks_select_policy" ON feedbacks;
DROP POLICY IF EXISTS "feedbacks_insert_policy" ON feedbacks;
DROP POLICY IF EXISTS "feedbacks_update_policy" ON feedbacks;

-- RLS Policies (permissive since app uses custom auth, not Supabase Auth)
-- Note: Application-level permission checks are handled in the frontend

-- SELECT: Allow all authenticated requests
CREATE POLICY "feedbacks_select_policy" ON feedbacks
FOR SELECT USING (true);

-- INSERT: Allow all authenticated requests
CREATE POLICY "feedbacks_insert_policy" ON feedbacks
FOR INSERT WITH CHECK (true);

-- UPDATE: Allow all authenticated requests
CREATE POLICY "feedbacks_update_policy" ON feedbacks
FOR UPDATE USING (true);

-- Grant permissions
GRANT ALL ON feedbacks TO authenticated;
GRANT ALL ON feedbacks TO anon;
