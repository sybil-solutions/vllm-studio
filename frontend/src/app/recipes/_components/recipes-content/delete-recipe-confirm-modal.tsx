// CRITICAL
"use client";

type Props = {
  recipeName: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteRecipeConfirmModal({ recipeName, onCancel, onConfirm }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1b1b1b] border border-[#363432] rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Delete Recipe</h3>
        <p className="text-sm text-[#9a9088] mb-6">
          Are you sure you want to delete &quot;
          {recipeName}&quot;?
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-[#363432] hover:bg-[#494745] rounded-lg text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white rounded-lg text-sm transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

