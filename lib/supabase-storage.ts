import { supabase } from '@/lib/supabase'

const BUCKET = 'job-photos'

/**
 * Uploads an image file to the job-photos bucket and inserts a row
 * into job_photos with the resulting storage_path.
 *
 * Path format: jobs/{jobId}/{timestamp}-{sanitizedFilename}
 *
 * @returns The inserted job_photos row, or throws on failure.
 */
export async function uploadJobPhoto(
  jobId:   string,
  file:    File,
  caption?: string,
) {
  // 1. Get the current user (must be the assigned cleaner)
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Not authenticated')

  // 2. Build a unique, safe storage path
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath   = `jobs/${jobId}/${Date.now()}-${sanitizedName}`

  // 3. Upload the file
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert:       false,
      contentType:  file.type,
    })

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

  // 4. Insert the metadata row
  const { data, error: insertError } = await supabase
    .from('job_photos')
    .insert({
      job_id:       jobId,
      uploaded_by:  user.id,
      storage_path: storagePath,
      caption:      caption ?? null,
    })
    .select()
    .single()

  if (insertError) {
    // Best-effort cleanup: remove the uploaded file so storage and DB stay in sync
    await supabase.storage.from(BUCKET).remove([storagePath])
    throw new Error(`DB insert failed: ${insertError.message}`)
  }

  return data
}

/**
 * Fetches all photo rows for a job and returns each one enriched with
 * a short-lived signed URL (valid for 1 hour).
 *
 * @returns Array of { id, caption, created_at, url }
 */
export async function getJobPhotoUrls(jobId: string) {
  // 1. Fetch the metadata rows
  const { data: photos, error: fetchError } = await supabase
    .from('job_photos')
    .select('id, storage_path, caption, created_at')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true })

  if (fetchError) throw new Error(`Failed to fetch photos: ${fetchError.message}`)
  if (!photos || photos.length === 0) return []

  // 2. Generate signed URLs in one batch call
  const paths = photos.map((p) => p.storage_path)

  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, 60 * 60) // 1 hour TTL

  if (signError) throw new Error(`Failed to sign URLs: ${signError.message}`)

  // 3. Merge metadata + signed URL
  return photos.map((photo, i) => ({
    id:         photo.id,
    caption:    photo.caption as string | null,
    created_at: photo.created_at as string,
    url:        signed?.[i]?.signedUrl ?? null,
  }))
}

/**
 * Deletes a photo from storage and removes its metadata row.
 * Only the uploader or an admin should call this.
 */
export async function deleteJobPhoto(photoId: string, storagePath: string) {
  const [{ error: storageError }, { error: dbError }] = await Promise.all([
    supabase.storage.from(BUCKET).remove([storagePath]),
    supabase.from('job_photos').delete().eq('id', photoId),
  ])

  if (storageError) throw new Error(`Storage delete failed: ${storageError.message}`)
  if (dbError)      throw new Error(`DB delete failed: ${dbError.message}`)
}
