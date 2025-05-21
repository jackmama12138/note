"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, FileText, Image, Link, Clock, FolderOpen, X, DownloadCloud } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthForm } from "@/components/auth/auth-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

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
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .order("updated_at", { ascending: false });

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

  const handleCreateNote = async () => {
    console.log('handleCreateNote called', newNote);
    if (!newNote.content && attachments.length === 0) {
      // 内容和附件都为空才提示
      console.log('内容和附件都为空，toast 应该弹出');
      toast({
        title: "错误",
        description: "内容和附件不能同时为空",
        variant: "destructive",
      });
      return;
    }
    // 如果标题为空，自动用内容前20字或第一个附件名作为标题
    let noteTitle = newNote.title.trim();
    if (!noteTitle) {
      if (newNote.content) {
        noteTitle = newNote.content.slice(0, 20);
      } else if (attachments.length > 0) {
        noteTitle = attachments[0].name;
      }
    }
    const { error } = await supabase.from("notes").insert([
      {
        title: noteTitle,
        content: newNote.content,
        user_id: session.user.id,
        attachments,
      },
    ]);

    if (error) {
      toast({
        title: "错误",
        description: "创建笔记失败",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "成功",
      description: "笔记已创建",
    });
    
    setNewNote({ title: "", content: "" });
    setIsNewNoteOpen(false);
    fetchNotes();
  };

  // 上传文件到 Supabase Storage
  const handleFileUpload = async (file: File) => {
    console.log('handleFileUpload called', file);
    const fileExt = file.name.split('.').pop();
    const filePath = `${session.user.id}/${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage.from('note').upload(filePath, file);
    if (error) {
      console.log('上传失败', error);
      toast({
        title: "上传失败",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    // 获取公开URL
    const { data: publicUrlData } = supabase.storage.from('note').getPublicUrl(filePath);
    const url = publicUrlData?.publicUrl;
    if (url) {
      // 新附件对象，type 字段为真实类型
      const attachment = {
        name: file.name,
        type: file.type, // 真实类型，如 image/png、text/plain、application/pdf
        url,
        size: file.size,
        filePath,
      };
      setAttachments((prev) => [...prev, attachment]);
      toast({ title: "上传成功", description: file.name });
      console.log('上传成功', url);
    } else {
      console.log('获取公开URL失败', publicUrlData);
    }
  };

  // 删除附件
  const handleDeleteAttachment = async (filePath: string) => {
    const { error } = await supabase.storage.from('note').remove([filePath]);
    if (error) {
      toast({ title: "删除失败", description: error.message, variant: "destructive" });
      return;
    }
    setAttachments((prev) => prev.filter(att => att.filePath !== filePath));
    toast({ title: "已删除" });
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
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    let foundFile = false;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          handleFileUpload(file);
          foundFile = true;
        }
      }
    }
    if (foundFile) {
      e.preventDefault(); // 阻止默认粘贴行为
    }
  };

  // 读取 txt 文件内容（加时间戳避免缓存）
  const fetchTxtContent = async (url: string) => {
    const res = await fetch(url + '?t=' + Date.now());
    return await res.text();
  };

  // 保存 txt 编辑
  const handleSaveTxt = async () => {
    if (!editTxt) return;
    const blob = new Blob([editTxt.content], { type: editTxt.att.type });
    // 覆盖上传
    const { error } = await supabase.storage.from('note').upload(editTxt.att.filePath, blob, { upsert: true });
    if (error) {
      toast({ title: "保存失败", description: error.message, variant: "destructive" });
      return;
    }
    // 保存后强制刷新内容
    // const newContent = await fetchTxtContent(editTxt.att.url);
    // setEditTxt({ ...editTxt, content: newContent });
    toast({ title: "已保存" });
    setEditTxt(null); // 自动关闭弹窗
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

  // 删除笔记
  const handleDeleteNote = async (noteId: number) => {
    // 先查找该笔记的附件，删除 storage 文件
    const note = notes.find(n => n.id === noteId);
    let attachmentsArr: any[] = [];
    try {
      attachmentsArr = Array.isArray(note.attachments) ? note.attachments : JSON.parse(note.attachments || '[]');
    } catch { attachmentsArr = []; }
    for (const att of attachmentsArr) {
      if (att.filePath) {
        await supabase.storage.from('note').remove([att.filePath]);
      }
    }
    // 删除笔记
    await supabase.from('notes').delete().eq('id', noteId);
    toast({ title: '已删除' });
    setDeleteNoteId(null);
    fetchNotes();
  };

  // 强制下载函数
  const handleDownload = async (url: string, name: string) => {
    const res = await fetch(url);
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
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
      <div className="w-64 border-r bg-card p-4">
        <div className="mb-6">
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
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="搜索笔记..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <nav>
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedTab(item.id)}
              className={`flex items-center w-full p-2 rounded-lg mb-1 ${
                selectedTab === item.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-secondary"
              }`}
            >
              <item.icon className="h-5 w-5 mr-3" />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <h2 className="text-2xl font-semibold mb-6">
          {sidebarItems.find((item) => item.id === selectedTab)?.label}
        </h2>
        <div className="grid gap-4">
          {filteredNotes.map((note) => {
            let attachmentsArr: any[] = [];
            try {
              attachmentsArr = Array.isArray(note.attachments) ? note.attachments : JSON.parse(note.attachments || '[]');
            } catch { attachmentsArr = []; }
            const firstAtt = attachmentsArr[0];
            return (
              <div
                key={note.id}
                className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow cursor-pointer flex gap-4 items-center relative"
                onDoubleClick={() => openEditDialog(note)}
              >
                {/* 删除按钮 */}
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-2 top-2 z-10 bg-white/80 hover:bg-red-500 hover:text-white shadow-md border border-red-200 transition-colors"
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                  onClick={e => { e.stopPropagation(); setDeleteNoteId(note.id); }}
                  title="删除笔记"
                >
                  <X className="w-4 h-4" />
                </Button>
                {/* 下载按钮（如果有附件） */}
                {firstAtt && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-full bg-white/80 hover:bg-blue-500 hover:text-white shadow border border-blue-200 transition-colors absolute right-12 top-2"
                    style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                    title="下载附件"
                    onClick={e => {
                      e.stopPropagation();
                      handleDownload(firstAtt.url, firstAtt.name);
                    }}
                  >
                    <DownloadCloud className="w-4 h-4" />
                  </Button>
                )}
                {/* 附件缩略图/图标区（首页） */}
                {attachmentsArr.length > 0 && (
                  <div className="flex flex-wrap gap-2 items-center">
                    {attachmentsArr.slice(0, 7).map((att: any) => (
                      att.type && att.type.startsWith('image/') ? (
                        <img key={att.url} src={att.url} alt={att.name} className="w-10 h-10 object-cover rounded" />
                      ) : att.type === 'text/plain' ? (
                        <span key={att.url} className="w-10 h-10 flex items-center justify-center bg-yellow-400/80 rounded text-white text-xs font-bold">TXT</span>
                      ) : att.type === 'link' ? (
                        <span key={att.url} className="w-10 h-10 flex items-center justify-center bg-blue-400/80 rounded text-white text-xs font-bold">LINK</span>
                      ) : (
                        <span key={att.url} className="w-10 h-10 flex items-center justify-center bg-secondary rounded text-xs text-gray-600 font-bold">{att.name.split('.').pop()?.toUpperCase()}</span>
                      )
                    ))}
                    {attachmentsArr.length > 7 && !showAllNoteAttachments?.[note.id] && (
                      <button
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 text-gray-600 font-bold text-base border border-gray-300 hover:bg-gray-300 transition"
                        onClick={e => { e.stopPropagation(); setShowAllNoteAttachments({ ...showAllNoteAttachments, [note.id]: true }); }}
                      >
                        +{attachmentsArr.length - 7}
                      </button>
                    )}
                    {attachmentsArr.length > 7 && showAllNoteAttachments?.[note.id] && (
                      <button
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 text-gray-600 font-bold text-base border border-gray-300 hover:bg-gray-300 transition"
                        onClick={e => { e.stopPropagation(); setShowAllNoteAttachments({ ...showAllNoteAttachments, [note.id]: false }); }}
                      >
                        收起
                      </button>
                    )}
                    {attachmentsArr.length > 7 && showAllNoteAttachments?.[note.id] && attachmentsArr.slice(7).map((att: any) => (
                      att.type && att.type.startsWith('image/') ? (
                        <img key={att.url} src={att.url} alt={att.name} className="w-10 h-10 object-cover rounded" />
                      ) : att.type === 'text/plain' ? (
                        <span key={att.url} className="w-10 h-10 flex items-center justify-center bg-yellow-400/80 rounded text-white text-xs font-bold">TXT</span>
                      ) : att.type === 'link' ? (
                        <span key={att.url} className="w-10 h-10 flex items-center justify-center bg-blue-400/80 rounded text-white text-xs font-bold">LINK</span>
                      ) : (
                        <span key={att.url} className="w-10 h-10 flex items-center justify-center bg-secondary rounded text-xs text-gray-600 font-bold">{att.name.split('.').pop()?.toUpperCase()}</span>
                      )
                    ))}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium truncate">{note.title}</h3>
                    <span className="text-sm text-muted-foreground">
                      {new Date(note.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {renderContentWithLinks(note.content)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New Note Dialog */}
      <Dialog open={isNewNoteOpen} onOpenChange={(open) => {
        setIsNewNoteOpen(open);
        if (!open) {
          setEditNote(null);
          setNewNote({ title: '', content: '' });
          setAttachments([]);
        } else {
          // 打开时内容输入框自动获取焦点
          setTimeout(() => {
            contentInputRef.current?.focus();
          }, 100);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editNote ? '编辑笔记' : '新建笔记'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Input
                placeholder="标题"
                value={newNote.title}
                onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              {/* 拖拽/粘贴上传区域 */}
              <div
                className="border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:bg-secondary mb-2"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
              >
                拖拽或点击上传图片/附件，粘贴图片也可自动上传
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files) {
                      Array.from(e.target.files).forEach(handleFileUpload);
                    }
                  }}
                />
              </div>
              {/* 附件展示区（编辑弹窗） */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-2 items-center">
                  {(showAllAttachments ? attachments : attachments.slice(0, 7)).map((att: any) => (
                    <div key={att.url} className="border rounded p-2 flex items-center gap-2 bg-muted relative" style={{ minWidth: 120 }}>
                      {att.type.startsWith('image/') ? (
                        <>
                          <img src={att.url} alt={att.name} className="w-16 h-16 object-cover rounded cursor-pointer" onClick={e => { e.stopPropagation(); setPreviewImg(att.url); }} />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-full bg-white/80 hover:bg-blue-500 hover:text-white shadow border border-blue-200 transition-colors absolute right-2 top-2"
                            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                            title="下载"
                            onClick={e => { e.stopPropagation(); handleDownload(att.url, att.name); }}
                          >
                            <DownloadCloud className="w-4 h-4" />
                          </Button>
                        </>
                      ) : att.type === 'text/plain' ? (
                        <>
                          <span className="w-10 h-10 flex items-center justify-center bg-secondary rounded text-xs cursor-pointer" onClick={async (e) => { e.preventDefault(); setEditTxt({ att, content: await fetchTxtContent(att.url) }); }}>{att.name.split('.').pop()?.toUpperCase()}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-full bg-white/80 hover:bg-blue-500 hover:text-white shadow border border-blue-200 transition-colors absolute right-2 top-2"
                            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                            title="下载"
                            onClick={e => { e.stopPropagation(); handleDownload(att.url, att.name); }}
                          >
                            <DownloadCloud className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="w-10 h-10 flex items-center justify-center bg-secondary rounded text-xs">{att.name.split('.').pop()?.toUpperCase()}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-full bg-white/80 hover:bg-blue-500 hover:text-white shadow border border-blue-200 transition-colors absolute right-2 top-2"
                            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                            title="下载"
                            onClick={e => { e.stopPropagation(); handleDownload(att.url, att.name); }}
                          >
                            <DownloadCloud className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{att.name}</div>
                        <div className="text-xs text-muted-foreground">{(att.size/1024).toFixed(1)} KB</div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => handleDeleteAttachment(att.filePath)} title="删除">
                        <span className="text-red-500">✕</span>
                      </Button>
                    </div>
                  ))}
                  {attachments.length > 7 && !showAllAttachments && (
                    <button
                      className="w-16 h-16 flex items-center justify-center rounded-full bg-gray-200 text-gray-600 font-bold text-lg border border-gray-300 hover:bg-gray-300 transition"
                      onClick={() => setShowAllAttachments(true)}
                    >
                      +{attachments.length - 7}
                    </button>
                  )}
                  {showAllAttachments && (
                    <button
                      className="w-16 h-16 flex items-center justify-center rounded-full bg-gray-200 text-gray-600 font-bold text-lg border border-gray-300 hover:bg-gray-300 transition"
                      onClick={() => setShowAllAttachments(false)}
                    >
                      收起
                    </button>
                  )}
                </div>
              )}
              <Textarea
                placeholder="内容"
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                className="min-h-[200px]"
                onPaste={handlePaste}
                ref={contentInputRef}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsNewNoteOpen(false);
              setEditNote(null);
              setNewNote({ title: '', content: '' });
              setAttachments([]);
            }}>
              取消
            </Button>
            <Button onClick={handleSaveNote}>
              {editNote ? '保存修改' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 图片预览 Dialog */}
      <Dialog open={!!previewImg} onOpenChange={() => setPreviewImg(null)}>
        <DialogContent className="flex flex-col items-center justify-center">
          <DialogHeader>
            <DialogTitle>图片预览</DialogTitle>
          </DialogHeader>
          {previewImg && <img src={previewImg} alt="预览" className="max-w-full max-h-[70vh] rounded" />}
        </DialogContent>
      </Dialog>
      {/* txt 编辑 Dialog */}
      <Dialog open={!!editTxt} onOpenChange={() => setEditTxt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑文本文件：{editTxt?.att.name}</DialogTitle>
          </DialogHeader>
          <Textarea
            className="min-h-[200px]"
            value={editTxt?.content || ''}
            onChange={e => setEditTxt(editTxt ? { ...editTxt, content: e.target.value } : null)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTxt(null)}>取消</Button>
            <Button onClick={handleSaveTxt}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除笔记确认 Dialog */}
      <Dialog open={!!deleteNoteId} onOpenChange={() => setDeleteNoteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <div className="py-4">确定要删除这条笔记吗？相关附件也会被一并删除。</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteNoteId(null)}>取消</Button>
            <Button variant="destructive" onClick={() => deleteNoteId && handleDeleteNote(deleteNoteId)}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}