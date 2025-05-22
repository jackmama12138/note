import { Button } from "@/components/ui/button";
import { X, DownloadCloud, LinkIcon } from "lucide-react";
import { useState } from "react";

interface NoteCardProps {
  note: any;
  openEditDialog: (note: any) => void;
  setDeleteNoteId: (id: number | null) => void;
  handleDownload: (url: string, name: string) => void;
  setPreviewImg: (url: string | null) => void;
  renderContentWithLinks: (content: string) => React.ReactNode;
  handleDeleteAttachment: (filePath: string) => Promise<void>;
}

export default function NoteCard({
  note,
  openEditDialog,
  setDeleteNoteId,
  handleDownload,
  setPreviewImg,
  renderContentWithLinks,
  handleDeleteAttachment,
}: NoteCardProps) {
  // 解析附件数组
  let attachmentsArr: any[] = [];
  try {
    attachmentsArr = Array.isArray(note.attachments)
      ? note.attachments
      : JSON.parse(note.attachments || "[]");
  } catch {
    attachmentsArr = [];
  }

  const imageAttachments = attachmentsArr.filter(
    (att) => att.type && att.type.startsWith("image/")
  );
  const otherAttachments = attachmentsArr.filter(
    (att) => !att.type || !att.type.startsWith("image/")
  );

  const totalAttachments = attachmentsArr.length;
  const [showAllNoteAttachments, setShowAllNoteAttachments] = useState<{
    [key: number]: boolean;
  }>({});

  const showAll = showAllNoteAttachments[note.id];
  const showExpandButton = totalAttachments > 5;

  const attachmentsToShow = showAll
    ? attachmentsArr
    : attachmentsArr.slice(0, 5);

  return (
    <div
      key={note.id}
      className={`p-4 rounded-lg border bg-card hover:shadow-md transition-shadow cursor-pointer flex flex-col gap-2 relative group w-full overflow-auto ${
        imageAttachments.length
          ? "min-h-[130px] max-h-[130px]"
          : otherAttachments.length
          ? "min-h-[95px] max-h-[95px]"
          : "min-h-[100px] max-h-[100px]"
      }`}
      onDoubleClick={() => openEditDialog(note)}
    >
      {/* 右上角删除按钮 */}
      <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Button
          size="icon"
          variant="ghost"
          className="rounded-full bg-white/80 hover:bg-red-500 hover:text-white shadow-md border border-red-200 transition-colors p-1"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
          onClick={(e) => {
            e.stopPropagation();
            setDeleteNoteId(note.id);
          }}
          title="删除笔记"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* 附件区域 */}
      {attachmentsArr.length > 0 && (
        <div className="flex gap-2 overflow-auto min-w-[180px] items-center">
          {attachmentsToShow.map((att: any) => {
            const isImage = att.type && att.type.startsWith("image/");
            const isLink = att.type === "link";

            // 图片预览
            if (isImage) {
              return (
                <img
                  key={att.url}
                  src={att.url}
                  alt={att.name}
                  className="w-24 h-24 object-cover rounded flex-shrink-0 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewImg(att.url);
                  }}
                />
              );
            }

            // 链接类型，整个区域都可点击跳转
            const content = (
              <div
                className={`border rounded p-2 flex items-center gap-2 bg-muted relative min-w-[180px] max-w-[180px]`}
              >
                <div className="w-10 h-10 flex items-center justify-center bg-blue-400/80 rounded text-white text-xs font-bold flex-shrink-0 cursor-pointer">
                  <LinkIcon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium text-xs">
                    {att.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    链接
                  </div>
                </div>
              </div>
            );

            return isLink ? (
              <a
                key={`${note.id}-${att.url}`}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                {content}
              </a>
            ) : (
              // 其他类型文件，如 PDF、TXT 等
              <div
                key={`${note.id}-${att.filePath || att.url}`}
                className={`border rounded p-2 flex items-center gap-2 bg-muted relative min-w-[180px] max-w-[180px]`}
              >
                <span className="w-10 h-10 flex items-center justify-center bg-secondary rounded text-xs text-gray-600 font-bold flex-shrink-0">
                  {att.name.split(".").pop()?.toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium text-xs">
                    {att.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(att.size / 1024).toFixed(1)} KB
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="rounded-full bg-white/80 hover:bg-blue-500 hover:text-white shadow border border-blue-200 transition-colors flex-shrink-0"
                  style={{
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  }}
                  title="下载"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(att.url, att.name);
                  }}
                >
                  <DownloadCloud className="w-4 h-4" />
                </Button>
              </div>
            );
          })}

          {/* 展开/收起 按钮 */}
          {showExpandButton && (
            <button
              className="w-16 min-h-[50px] flex items-center justify-center rounded bg-gray-200 text-gray-600 font-bold text-xs border border-gray-300 hover:bg-gray-300 transition flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setShowAllNoteAttachments((prev) => ({
                  ...prev,
                  [note.id]: !prev?.[note.id],
                }));
              }}
            >
              {showAll ? "收起" : `+${totalAttachments - 5}`}
            </button>
          )}
        </div>
      )}

      {/* 标题和时间 */}
      {attachmentsArr.length === 0 && (note.title || note.content) && (
        <div className="mb-2 flex items-start justify-between">
          <h3 className="text-lg font-semibold truncate flex-1 pr-4">
            {note.title ||
              note.content.slice(0, 30) +
                (note.content.length > 30 ? "..." : "")}
          </h3>
          <span className="text-sm text-gray-500 flex-shrink-0">
            {new Date(note.created_at).toLocaleDateString()}
          </span>
        </div>
      )}

      {/* 文本内容 */}
      {attachmentsArr.length === 0 && note.content && (
        <p className="text-sm truncate whitespace-nowrap w-[380px] text-gray-600 flex-grow overflow-hidden">
          {renderContentWithLinks(note.content)}
        </p>
      )}
    </div>
  );
}
