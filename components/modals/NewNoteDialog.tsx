import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { X, DownloadCloud, LinkIcon } from "lucide-react";
import { useRef } from "react";

interface NewNoteDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  newNote: { title: string; content: string };
  setNewNote: (note: { title: string; content: string }) => void;
  attachments: any[];
  setAttachments: (attachments: any[]) => void;
  editNote: any | null;
  setEditNote: (note: any | null) => void;
  handleSaveNote: () => Promise<void>;
  handleFileUpload: (file: File) => Promise<void>;
  handleDeleteAttachment: (filePath: string) => Promise<void>;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handlePaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  fetchTxtContent: (url: string) => Promise<string>;
  handleSaveTxt: () => Promise<void>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  contentInputRef: React.RefObject<HTMLTextAreaElement>;
  toast: any; // Replace with actual Toast type if available
  setPreviewImg: (url: string | null) => void;
  setEditTxt: (editTxt: { att: any; content: string } | null) => void;
  handleDownload: (url: string, name: string) => void;
}

export default function NewNoteDialog({
  isOpen,
  setIsOpen,
  newNote,
  setNewNote,
  attachments,
  setAttachments,
  editNote,
  setEditNote,
  handleSaveNote,
  handleFileUpload,
  handleDeleteAttachment,
  handleDrop,
  handlePaste,
  fetchTxtContent,
  handleSaveTxt,
  fileInputRef,
  contentInputRef,
  toast,
  setPreviewImg,
  setEditTxt,
  handleDownload,
}: NewNoteDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        setEditNote(null);
        setNewNote({ title: '', content: '' });
        setAttachments([]);
      } else {
        setTimeout(() => {
          contentInputRef.current?.focus();
        }, 100);
      }
    }}>
      <DialogContent className="max-w-[100vh] w-full max-h-[90vh] h-full flex flex-col bg-white rounded-lg shadow-xl p-0">
        <DialogHeader className="px-8 pt-8 pb-2">
          <DialogTitle className="text-2xl font-bold">{editNote ? '编辑笔记' : '新建笔记'}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 grid grid-cols-[2fr_1fr] py-4 pl-[1rem] overflow-hidden">
          {/* 左侧内容输入区 */}
          <div className="flex flex-col min-w-[65vh] max-w-[65vh] gap-4 overflow-y-auto ">
            <Textarea
              placeholder="内容"
              value={newNote.content}
              onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              className="flex-1 min-h-[300px] rounded border border-gray-300 px-4 py-3 text-base resize-none focus:outline-none focus:border-gray-400 bg-white"
              onPaste={handlePaste}
              ref={contentInputRef}
            />
          </div>
          {/* 右侧附件上传和展示区 */}
          <div className="w-full flex flex-col gap-4 flex-shrink-0 min-w-[30vh] max-w-[30vh] min-h-[600px] max-h-[600px] pl-2">
            <div
              className="border-2 border-dashed rounded-md p-5 text-center cursor-pointer bg-secondary hover:bg-secondary/80 transition flex flex-col items-center justify-center gap-2 shadow-sm"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <DownloadCloud className="w-8 h-8 opacity-60 mb-1" />
              <span className="font-medium">拖拽或点击上传图片/附件</span>
              <span className="text-xs text-gray-400">粘贴图片也可自动上传</span>
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
            {/* 附件展示区 */}
            {attachments.length > 0 && (
              <div className="flex flex-col gap-3 flex-1 max-h-[100vh] overflow-y-auto">
                {attachments.map((att: any) => (
                  <div key={att.url} className="border rounded-lg p-2 flex items-center gap-3 bg-white shadow-sm hover:shadow-md transition min-w-0 relative group">
                    {att.type.startsWith('image/') ? (
                      <img src={att.url} alt={att.name} className="w-14 h-14 object-cover rounded-lg flex-shrink-0 border border-gray-200 cursor-pointer hover:scale-105 transition" onClick={e => { e.stopPropagation(); /* TODO: Implement image preview in modal */ }} />
                    ) : att.type === 'text/plain' ? (
                      <span className="w-12 h-12 flex items-center justify-center bg-secondary rounded-lg text-xs font-semibold cursor-pointer flex-shrink-0 border border-gray-200 hover:bg-secondary/80 transition" onClick={async (e) => { e.preventDefault(); /* TODO: Implement txt edit in modal */ }}>{att.name.split('.').pop()?.toUpperCase()}</span>
                    ) : att.type === 'link' ? (
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="w-12 h-12 flex items-center justify-center bg-blue-400/80 rounded-lg text-white text-base font-bold flex-shrink-0 cursor-pointer hover:bg-blue-500 transition" onClick={e => e.stopPropagation()}>
                        <LinkIcon className="w-6 h-6" />
                      </a>
                    ) : (
                      <span className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 text-sm font-bold flex-shrink-0 border border-gray-200">{att.name.split('.').pop()?.toUpperCase()}</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium text-sm text-gray-900">{att.name}</div>
                      <div className="text-xs text-gray-400">{(att.size/1024).toFixed(1)} KB</div>
                    </div>
                    <div className="flex gap-1 items-center ml-2">
                      <Button size="icon" variant="ghost" onClick={() => handleDeleteAttachment(att.filePath)} title="删除" className="flex-shrink-0 hover:bg-red-50 group-hover:visible visible">
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                      {/* {att.type !== 'link' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="rounded-full bg-white hover:bg-blue-500 hover:text-white shadow border border-blue-200 transition-colors flex-shrink-0"
                          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                          title="下载"
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handleDownload(att.url, att.name); }}
                        >
                          <DownloadCloud className="w-4 h-4" />
                        </Button>
                      )} */}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="mt-2 flex gap-3 justify-end flex-shrink-0 px-8 pb-6">
          <Button variant="outline" onClick={() => {
            setIsOpen(false);
            setEditNote(null);
            setNewNote({ title: '', content: '' });
            setAttachments([]);
          }} className="rounded-lg px-6 py-2 text-base">
            取消
          </Button>
          <Button onClick={handleSaveNote} className="rounded-lg px-6 py-2 text-base bg-primary hover:bg-primary/90 text-white shadow">
            {editNote ? '保存修改' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 