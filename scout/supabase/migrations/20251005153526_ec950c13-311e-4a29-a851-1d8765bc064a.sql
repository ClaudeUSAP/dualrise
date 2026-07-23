-- Add whatsapp_number column to contact_requests table
ALTER TABLE contact_requests 
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- Add comment for the new column
COMMENT ON COLUMN contact_requests.whatsapp_number IS 'WhatsApp number for contact (required)';