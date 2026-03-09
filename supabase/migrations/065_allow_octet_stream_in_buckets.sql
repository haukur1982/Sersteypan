-- Allow application/octet-stream in project-documents bucket.
-- Browsers commonly send this MIME type for DWG/DXF files
-- instead of the proper application/dwg.
UPDATE storage.buckets
SET allowed_mime_types = array_cat(
  allowed_mime_types,
  ARRAY['application/octet-stream', 'application/x-dwg', 'application/acad', 'application/dxf']
)
WHERE id = 'project-documents'
  AND NOT ('application/octet-stream' = ANY(allowed_mime_types));
