"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, FileText, Image, Link, Clock, FolderOpen, X, DownloadCloud } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthForm } from "@/components/auth/auth-form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import NoteCard from "@/components/notes/NoteCard";
import NewNoteDialog from "@/components/modals/NewNoteDialog";
import ImagePreviewDialog from "@/components/modals/ImagePreviewDialog";
import TxtEditDialog from "@/components/modals/TxtEditDialog";
import DeleteConfirmationDialog from "@/components/modals/DeleteConfirmationDialog";
import { Toaster } from "@/components/ui/toaster";

// Import server actions
import { createNoteServer, updateNoteServer, fetchNotesServer, deleteNoteServer, deleteAttachmentServer, saveTxtServer, uploadFileServer } from "@/app/actions";

export default function Home() {
  const [selectedTab, setSelectedTab] = useState("all");
  const [session, setSession] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewNoteOpen, setIsNewNoteOpen] = useState(false);
  const [newNote, setNewNote] = useState({ title: "", content: "" });
  const [attachments, setAttachments] = useState<any[]>([]);
  const [previewImg, setPreviewImg] = useState<string|null>(null);
  const [editTxt, setEditTxt] = useState<{att: any, content: string}|null>(null);
  const [editNote, setEditNote] = useState<any|null>(null);
  const { toast } = useToast();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteNoteId, setDeleteNoteId] = useState<number|null>(null);
  const contentInputRef = useRef<HTMLTextAreaElement>(null);
  const [showAllAttachments, setShowAllAttachments] = useState(false);
  const [showAllNoteAttachments, setShowAllNoteAttachments] = useState<any|null>(null);

  // 链接正则（排除本地 127.0.0.1，完整匹配路径参数等）
  const linkRegex = /https?:\/\/(?!127\.0\.0\.1)[^\s]+/gi;

  // 渲染内容时高亮链接
  const renderContentWithLinks = (content: string) => {
    if (!content) return null;
    const parts = [];
    let lastIndex = 0;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      const url = match[0];
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }
      parts.push(
        <a
          key={url + match.index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline break-all hover:text-blue-800"
        >
          {url}
        </a>
      );
      lastIndex = match.index + url.length;
    }
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }
    return parts;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchNotes();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchNotes();
        toast({
          title: "登录成功",
          description: "欢迎回来！",
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchNotes = async () => {
    // Use server action to fetch notes
    const { data, error } = await fetchNotesServer();

    if (error) {
      console.error("Error fetching notes:", error);
      toast({
        title: "错误",
        description: "获取笔记失败",
        variant: "destructive",
      });
      return;
    }

    setNotes(data || []);
  };

  // Upload file to Supabase Storage - Now uses server action
  const handleFileUpload = async (file: File) => {
    console.log('handleFileUpload called', file);

    const formData = new FormData();
    formData.append('file', file);
    // The file path construction will now happen on the server for security
    formData.append('filePath', file.name); // Pass original file name, server will add user ID

    // Call the server action to upload the file
    const result = await uploadFileServer(formData);

    if (result.error) {
      console.error('上传失败', result.error);
      toast({
        title: "上传失败",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    // If upload is successful, add the returned file metadata to attachments state
    if (result.data) {
       setAttachments((prev) => [...prev, result.data]);
       toast({ title: "上传成功", description: file.name });
       console.log('上传成功', result.data.url);
    }
  };

  // 删除附件 - Now uses server action
  const handleDeleteAttachment = async (filePath: string) => {
    // Call the server action to delete the attachment
    const result = await deleteAttachmentServer(filePath);

    if (result.error) {
      toast({ title: "删除失败", description: result.error, variant: "destructive" });
      return;
    }

    // Update state client-side for immediate feedback
    setAttachments((prev) => prev.filter(att => att.filePath !== filePath));
    toast({ title: "已删除" });

    // Consider refetching notes or updating the specific note's attachments in state
    // Refetching all notes for now for simplicity:
     fetchNotes();
  };

  // 处理拖拽
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      console.log('handleDrop files', e.dataTransfer.files);
      Array.from(e.dataTransfer.files).forEach(handleFileUpload);
    }
  };

  // 处理粘贴
  // const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
  //   const items = e.clipboardData.items;
  //   let foundFile = false;
  //   for (let i = 0; i < items.length; i++) {
  //     const item = items[i];
  //     if (item.kind === 'file') {
  //       const file = item.getAsFile();
  //       if (file) {
  //         handleFileUpload(file);
  //         foundFile = true;
  //       }
  //     } else if (item.kind === 'string' && item.type === 'text/plain') {
  //       // Optionally handle pasting text
  //       item.getAsString(text => {
  //         // You might want to insert text at the cursor position
  //         const textarea = contentInputRef.current;
  //         if (textarea) {
  //           const start = textarea.selectionStart;
  //           const end = textarea.selectionEnd;
  //           const newText = textarea.value.substring(0, start) + text + textarea.value.substring(end);
  //           setNewNote({ ...newNote, content: newText });
  //           // Restore cursor position
  //           // textarea.selectionStart = textarea.selectionEnd = start + text.length;
  //         }
  //       });
  //     }
  //   }
  //   if (foundFile) {
  //     e.preventDefault(); // Prevent default paste behavior for files
  //   }
  // };
  //处理粘贴2
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    let hasFile = false;
  
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
  
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          await handleFileUpload(file);  // 无论是图片还是附件，都统一上传
          hasFile = true;
        }
      }
    }
  
    // ❗只有当粘贴内容中包含文件（图片、PDF等）时才阻止默认行为，避免 base64 粘贴
    if (hasFile) {
      e.preventDefault();
    }
  };
  
  
  // 读取 txt 文件内容（加时间戳避免缓存）
  const fetchTxtContent = async (url: string) => {
    const res = await fetch(url + '?t=' + Date.now());
    return await res.text();
  };

  // 保存 txt 编辑 - Now uses server action
  const handleSaveTxt = async () => {
    if (!editTxt) return;

    // Call the server action to save the text content
    const result = await saveTxtServer(editTxt.att.filePath, editTxt.content, editTxt.att.type);

    if (result.error) {
      toast({ title: "保存失败", description: result.error, variant: "destructive" });
      return;
    }

    // Saving successful
    toast({ title: "已保存" });
    setEditTxt(null); // Automatic close dialog

    // Consider refetching notes or updating state immutably if txt content is displayed in the card
    fetchNotes(); // Refetch notes to ensure latest data is shown
  };

  // 编辑时初始化表单
  const openEditDialog = (note: any) => {
    setEditNote(note);
    setIsNewNoteOpen(true);
    setNewNote({ title: note.title, content: note.content });
    let attachmentsArr: any[] = [];
    try {
      attachmentsArr = Array.isArray(note.attachments) ? note.attachments : JSON.parse(note.attachments || '[]');
    } catch { attachmentsArr = []; }
    setAttachments(attachmentsArr);
  };

  // 保存（新建或编辑）
  const handleSaveNote = async () => {
    if (!newNote.content && attachments.length === 0) {
      toast({
        title: "错误",
        description: "内容和附件不能同时为空",
        variant: "destructive",
      });
      return;
    }
    // 自动标题
    let noteTitle = newNote.title.trim();
    if (!noteTitle) {
      if (newNote.content) {
        noteTitle = newNote.content.slice(0, 20);
      } else if (attachments.length > 0) {
        noteTitle = attachments[0].name;
      }
    }
    // 链接识别
    let newAttachments = [...attachments];
    const links = (newNote.content.match(linkRegex) || []).filter(url => !url.startsWith('http://127.0.0.1'));
    if (links.length > 0) {
      // 只保留一个 link 类型附件，避免重复
      if (!newAttachments.some(att => att.type === 'link' && att.url === links[0])) {
        newAttachments = [
          ...newAttachments,
          {
            name: links[0],
            type: 'link',
            url: links[0],
            size: 0,
            filePath: '',
          },
        ];
      }
    } else {
      // 没有链接时移除 link 类型附件
      newAttachments = newAttachments.filter(att => att.type !== 'link');
    }
    // 自动类型
    let noteType = 'text';
    if (newAttachments.some(att => att.type && att.type.startsWith('image/'))) {
      noteType = 'image';
    } else if (newAttachments.some(att => att.type === 'text/plain')) {
      noteType = 'text';
    } else if (newAttachments.some(att => att.type && att.type !== 'text/plain' && !att.type.startsWith('image/') && att.type !== 'link')) {
      noteType = 'file';
    } else if (newAttachments.some(att => att.type === 'link')) {
      noteType = 'link';
    }
    let error;
    if (editNote) {
      // 编辑
      ({ error } = await supabase.from("notes").update({
        title: noteTitle,
        content: newNote.content,
        attachments: newAttachments,
        type: noteType,
      }).eq('id', editNote.id));
    } else {
      // 新建
      ({ error } = await supabase.from("notes").insert([
        {
          title: noteTitle,
          content: newNote.content,
          user_id: session.user.id,
          attachments: newAttachments,
          type: noteType,
        },
      ]));
    }
    if (error) {
      toast({ title: "错误", description: "保存失败", variant: "destructive" });
      return;
    }
    toast({ title: "成功", description: editNote ? "笔记已更新" : "笔记已创建" });
    setNewNote({ title: "", content: "" });
    setAttachments([]);
    setIsNewNoteOpen(false);
    setEditNote(null);
    fetchNotes();
  };

  // Delete note - Now uses server action
  const handleDeleteNote = async (noteId: number) => {
    // Delete the note using server action
    const result = await deleteNoteServer(noteId);

    if (result.error) {
      toast({ title: "删除失败", description: result.error, variant: "destructive" });
      return;
    }

    toast({ title: '已删除' });
    setDeleteNoteId(null);
    fetchNotes(); // Refetch notes after deletion
  };

  // 强制下载函数
  const handleDownload = async (url: string, name: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error: any) {
      toast({ title: "下载失败", description: error.message, variant: "destructive" });
    }
  };

  // 退出登录
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const sidebarItems = [
    { id: "all", icon: FileText, label: "全部笔记" },
    { id: "recent", icon: Clock, label: "最近使用" },
    { id: "files", icon: FolderOpen, label: "文件" },
    { id: "images", icon: Image, label: "图片" },
    { id: "links", icon: Link, label: "链接" },
  ];

  if (!session) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Toaster />
        <AuthForm />
      
      </div>
    );
  }

  const filteredNotes = notes.filter((note) => {
    const matchesSearch = searchQuery
      ? note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    const matchesType =
      selectedTab === "all" ||
      (selectedTab === "recent" && note.type === "text") ||
      (selectedTab === "files" && note.type === "file") ||
      (selectedTab === "images" && note.type === "image") ||
      (selectedTab === "links" && note.type === "link");

    return matchesSearch && matchesType;
  });

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <div className="w-64 border-r bg-card p-4 flex flex-col justify-between">
        <div>
          <Button 
            className="w-full mb-4" 
            size="lg"
            onClick={() => {
              setEditNote(null);
              setIsNewNoteOpen(true);
              setNewNote({ title: '', content: '' });
              setAttachments([]);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> 新建笔记
          </Button>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="搜索笔记..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <nav>
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedTab(item.id)}
                className={`flex items-center w-full p-2 rounded-lg mb-1 transition-colors font-medium text-sm ${
                  selectedTab === item.id
                    ? "bg-primary text-primary-foreground shadow"
                    : "hover:bg-secondary text-foreground"
                }`}
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        {/* 用户信息和退出登录 */}
        <div className="flex flex-col items-center gap-2 mt-8 p-2 border-t pt-4">
          <Avatar>
            <AvatarImage src={session.user?.user_metadata?.avatar_url || undefined} alt={session.user?.email || "用户"} />
            <AvatarFallback>{session.user?.email?.[0]?.toUpperCase() || "U"}</AvatarFallback>
          </Avatar>
          <div className="text-xs text-muted-foreground truncate max-w-[150px]">{session.user?.email}</div>
          <Button variant="outline" size="sm" className="w-full mt-2" onClick={handleLogout}>
            退出登录
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 flex flex-col h-screen overflow-hidden">
        <h2 className="text-2xl font-semibold mb-6">
          {sidebarItems.find((item) => item.id === selectedTab)?.label}
        </h2>
        {/* 更改了 */}
        {/* <div className="grid gap-4 overflow-y-auto flex-1 pr-2 mx-auto w-full"> */}
        <div className="flex flex-col gap-4 overflow-y-auto flex-1 pr-2 mx-auto w-full">
          {filteredNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              openEditDialog={openEditDialog}
              setDeleteNoteId={setDeleteNoteId}
              handleDownload={handleDownload}
              setPreviewImg={setPreviewImg}
              renderContentWithLinks={renderContentWithLinks}
              handleDeleteAttachment={handleDeleteAttachment}
            />
          ))}
        </div>
      </div>

      {/* New/Edit Note Dialog */}
      <NewNoteDialog
        isOpen={isNewNoteOpen}
        setIsOpen={setIsNewNoteOpen}
        newNote={newNote}
        setNewNote={setNewNote}
        attachments={attachments}
        setAttachments={setAttachments}
        editNote={editNote}
        setEditNote={setEditNote}
        handleSaveNote={handleSaveNote}
        handleFileUpload={handleFileUpload}
        handleDeleteAttachment={handleDeleteAttachment}
        handleDrop={handleDrop}
        handlePaste={handlePaste}
        fetchTxtContent={fetchTxtContent}
        handleSaveTxt={handleSaveTxt}
        fileInputRef={fileInputRef}
        contentInputRef={contentInputRef}
        toast={toast}
        setPreviewImg={setPreviewImg}
        setEditTxt={setEditTxt}
        handleDownload={handleDownload}
      />

      {/* Image Preview Dialog */}
      <ImagePreviewDialog
        previewImg={previewImg}
        setPreviewImg={setPreviewImg}
      />

      {/* txt 编辑 Dialog */}
      <TxtEditDialog
        editTxt={editTxt}
        setEditTxt={setEditTxt}
        handleSaveTxt={handleSaveTxt}
      />

      {/* 删除笔记确认 Dialog */}
      <DeleteConfirmationDialog
        deleteNoteId={deleteNoteId}
        setDeleteNoteId={setDeleteNoteId}
        handleDeleteNote={handleDeleteNote}
      />

      {/* Add the Toaster component here */}
      <Toaster />
    </div>
  );
}