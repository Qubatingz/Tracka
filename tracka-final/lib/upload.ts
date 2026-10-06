import { createClient } from './supabase/client';

// Upload a file to a storage bucket. Files always go in a folder named after the user: <user id>/...
export async function uploadFile(bucket: string, path: string, file: File) {
  const { error } = await createClient().storage.from(bucket).upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw new Error('Upload failed: ' + error.message);
  return path;
}

export function ext(file: File, fallback = 'bin') {
  const m = /\.([a-z0-9]{1,5})$/i.exec(file.name || '');
  return (m ? m[1] : fallback).toLowerCase();
}

export async function myId() {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user) throw new Error('Please log in again.');
  return user.id;
}
