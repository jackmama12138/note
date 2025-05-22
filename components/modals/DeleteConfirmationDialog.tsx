import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteConfirmationDialogProps {
  deleteNoteId: number | null;
  setDeleteNoteId: (id: number | null) => void;
  handleDeleteNote: (noteId: number) => Promise<void>;
}

export default function DeleteConfirmationDialog({
  deleteNoteId,
  setDeleteNoteId,
  handleDeleteNote,
}: DeleteConfirmationDialogProps) {
  return (
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
  );
} 