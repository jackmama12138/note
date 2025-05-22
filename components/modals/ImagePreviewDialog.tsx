import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ImagePreviewDialogProps {
  previewImg: string | null;
  setPreviewImg: (url: string | null) => void;
}

export default function ImagePreviewDialog({
  previewImg,
  setPreviewImg,
}: ImagePreviewDialogProps) {
  return (
    <Dialog open={!!previewImg} onOpenChange={() => setPreviewImg(null)}>
      <DialogContent className="flex flex-col items-center justify-center">
        <DialogHeader>
          <DialogTitle>图片预览</DialogTitle>
        </DialogHeader>
        {previewImg && <img src={previewImg} alt="预览" className="max-w-full max-h-[70vh] rounded" />}
      </DialogContent>
    </Dialog>
  );
} 