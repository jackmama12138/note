"use server";

import { createClient } from "@/lib/supabase/server";

export async function fetchNotesServer() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching notes server:", error);
    // In a real app, you might want to return a more specific error or throw it
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function createNoteServer(noteData: { title: string; content: string; attachments: any[] }) {
  const supabase = createClient();

  const { title, content, attachments } = noteData;

  // Get the user ID from the server-side session
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "User not authenticated" };
  }

  // If title is empty, automatically use content or first attachment name as title
  let noteTitle = title.trim();
  if (!noteTitle) {
    if (content) {
      noteTitle = content.slice(0, 20);
    } else if (attachments.length > 0) {
      noteTitle = attachments[0].name;
    }
  }

   // 链接识别 (Re-implementing link logic on the server side if needed, or handle client-side before calling action)
   // For simplicity, we'll assume links are handled client-side for now and passed in attachments

   // Automatic type detection (Re-implementing on the server side if needed, or handle client-side before calling action)
   // For simplicity, we'll assume type is determined client-side for now and passed in attachments data structure
   let noteType = 'text'; // Default type
   if (attachments.some(att => att.type && att.type.startsWith('image/'))) {
     noteType = 'image';
   } else if (attachments.some(att => att.type === 'text/plain')) {
     noteType = 'text';
   } else if (attachments.some(att => att.type && att.type !== 'text/plain' && !att.type.startsWith('image/') && att.type !== 'link')) {
     noteType = 'file';
   } else if (attachments.some(att => att.type === 'link')) {
     noteType = 'link';
   }


  const { data, error } = await supabase.from("notes").insert([
    {
      title: noteTitle,
      content: content,
      user_id: user.id,
      attachments: attachments,
      type: noteType,
    },
  ]).select(); // Select the inserted data to return it

  if (error) {
    console.error("Error creating note server:", error);
    return { data: null, error: error.message };
  }

  return { data: data[0], error: null }; // Return the first inserted row
}

export async function updateNoteServer(noteData: { id: number; title: string; content: string; attachments: any[] }) {
  const supabase = createClient();

  const { id, title, content, attachments } = noteData;

  // Get the user ID from the server-side session to ensure the user owns the note
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "User not authenticated" };
  }

   // Automatic type detection (handle server-side if needed)
   let noteType = 'text'; // Default type
   if (attachments.some(att => att.type && att.type.startsWith('image/'))) {
     noteType = 'image';
   } else if (attachments.some(att => att.type === 'text/plain')) {
     noteType = 'text';
   } else if (attachments.some(att => att.type && att.type !== 'text/plain' && !att.type.startsWith('image/') && att.type !== 'link')) {
     noteType = 'file';
   } else if (attachments.some(att => att.type === 'link')) {
     noteType = 'link';
   }

  const { data, error } = await supabase.from("notes")
    .update({
      title: title,
      content: content,
      attachments: attachments,
      type: noteType,
    })
    .eq('id', id)
    .eq('user_id', user.id) // Ensure the user owns the note
    .select(); // Select the updated data to return it

  if (error) {
    console.error("Error updating note server:", error);
    return { data: null, error: error.message };
  }

  return { data: data[0], error: null }; // Return the first updated row
}

export async function deleteNoteServer(noteId: number) {
  const supabase = createClient();

  // Get the user ID from the server-side session to ensure the user owns the note
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  // Fetch the note to get attachment paths
  const { data: noteData, error: fetchError } = await supabase
    .from('notes')
    .select('attachments')
    .eq('id', noteId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !noteData) {
    console.error("Error fetching note for deletion server:", fetchError);
    return { success: false, error: fetchError?.message || "Note not found or user does not own it" };
  }

  let attachmentsArr: any[] = [];
    try {
      attachmentsArr = Array.isArray(noteData.attachments) ? noteData.attachments : JSON.parse(noteData.attachments || '[]');
    } catch { attachmentsArr = []; }

  // Delete associated files from storage
  if (attachmentsArr.length > 0) {
     const filePathsToDelete = attachmentsArr
       .filter(att => att.filePath) // Only include attachments with file paths
       .map(att => att.filePath);

     if (filePathsToDelete.length > 0) {
       const { error: storageError } = await supabase.storage.from('note').remove(filePathsToDelete);
       if (storageError) {
         console.error("Error deleting storage files server:", storageError);
         // Decide how to handle storage deletion errors (e.g., log and continue, return error)
         // For now, we'll log and continue to delete the note record
       }
     }
  }

  // Delete the note record
  const { error: deleteError } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId)
    .eq('user_id', user.id); // Double check user ownership

  if (deleteError) {
    console.error("Error deleting note record server:", deleteError);
    return { success: false, error: deleteError.message };
  }

  return { success: true, error: null };
}

export async function deleteAttachmentServer(filePath: string) {
  const supabase = createClient();

  // Get the user ID from the server-side session
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  // In a real app, you would also want to verify that the user owns the note associated with this attachment before deleting the file.
  // This could involve querying the database for a note that contains this filePath in its attachments array and belongs to the current user.
  // For simplicity in this example, we will proceed with deletion assuming RLS on the storage bucket is configured to check user ownership of files based on path.

  const { error } = await supabase.storage.from('note').remove([filePath]);

  if (error) {
    console.error("Error deleting storage file server:", error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

export async function saveTxtServer(filePath: string, content: string, contentType: string) {
  const supabase = createClient();

  // Get the user ID from the server-side session
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

   // In a real app, you would also want to verify that the user owns the note and attachment associated with this filePath before saving.

  const blob = new Blob([content], { type: contentType });

  // Use upsert to overwrite the existing file
  const { error } = await supabase.storage.from('note').upload(filePath, blob, { upsert: true });

  if (error) {
    console.error("Error saving txt file server:", error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

export async function uploadFileServer(formData: FormData) {
  const supabase = createClient();

  const file = formData.get('file') as File;
  const filePath = formData.get('filePath') as string;

  if (!file || !filePath) {
    return { data: null, error: "File or filePath not provided" };
  }

  // Get the user ID from the server-side session to include in the storage path
   const { data: { user } } = await supabase.auth.getUser();

   if (!user) {
     return { data: null, error: "User not authenticated" };
   }

   // Construct the final secure file path including user ID
   const finalFilePath = `${user.id}/${filePath}`;

  const { data, error } = await supabase.storage.from('note').upload(finalFilePath, file, { upsert: true });

  if (error) {
    console.error("Error uploading file server:", error);
    return { data: null, error: error.message };
  }

  // Get the public URL for the uploaded file
  const { data: publicUrlData } = supabase.storage.from('note').getPublicUrl(finalFilePath);
  const url = publicUrlData?.publicUrl;

  if (!url) {
     console.error("Error getting public URL for uploaded file:", publicUrlData);
     return { data: null, error: "Could not get public URL for file" };
  }

  // Return the file metadata needed on the client
  const fileMetadata = {
     name: file.name,
     type: file.type,
     url: url,
     size: file.size,
     filePath: finalFilePath, // Return the full file path including user ID
  };

  return { data: fileMetadata, error: null };
} 

export async function loginWithEmailPasswordServer(email: string, password: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Error signing in:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}
