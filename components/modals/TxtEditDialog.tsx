import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface TxtEditDialogProps {
  editTxt: { att: any; content: string } | null;
  setEditTxt: (editTxt: { att: any; content: string } | null) => void;
  handleSaveTxt: () => Promise<void>;
}

export default function TxtEditDialog({
  editTxt,
  setEditTxt,
  handleSaveTxt,
}: TxtEditDialogProps) {
  return (
    <Dialog open={!!editTxt} onOpenChange={() => setEditTxt(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑文本文件：{editTxt?.att.name}</DialogTitle>
        </DialogHeader>
        <Textarea
          className="min-h-[200px]"
          value={editTxt?.content || ''}
          onChange={(e) =>
            setEditTxt(editTxt ? { ...editTxt, content: e.target.value } : null)
          }
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditTxt(null)}>
            取消
          </Button>
          <Button onClick={handleSaveTxt}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 