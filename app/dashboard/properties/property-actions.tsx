"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, MoreVertical, Save, Trash2, X } from "lucide-react";
import { deleteProperty, updateProperty } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type PropertyActionsProps = {
  property: {
    id: string;
    name: string;
    address: string;
    access_notes: string | null;
    parking_notes: string | null;
  };
};

export function PropertyActions({ property }: PropertyActionsProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  async function handleUpdate(formData: FormData) {
    setPending(true);
    setError("");
    setFeedback("");
    try {
      await updateProperty(formData);
      setEditOpen(false);
      setMenuOpen(false);
      setFeedback("Property updated.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update property.");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(formData: FormData) {
    setPending(true);
    setError("");
    setFeedback("");
    try {
      await deleteProperty(formData);
      setDeleteOpen(false);
      setMenuOpen(false);
      setFeedback("Property deleted.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete property.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative flex flex-col items-end gap-1" ref={menuRef}>
      <button
        type="button"
        aria-label="Property actions"
        aria-expanded={menuOpen}
        onClick={() => {
          setMenuOpen((open) => !open);
          setError("");
        }}
        className="flex h-9 w-9 items-center justify-center rounded-md border bg-white text-muted-foreground hover:bg-muted"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {feedback ? <p className="text-xs font-medium text-primary">{feedback}</p> : null}

      {menuOpen ? (
        <div className="absolute right-0 top-10 z-10 w-44 rounded-md border bg-white p-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              setEditOpen(true);
              setMenuOpen(false);
              setFeedback("");
              setError("");
            }}
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-muted"
          >
            <Edit3 className="h-4 w-4" />
            Edit property
          </button>
          <button
            type="button"
            onClick={() => {
              setDeleteOpen(true);
              setMenuOpen(false);
              setFeedback("");
              setError("");
            }}
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-destructive hover:bg-muted"
          >
            <Trash2 className="h-4 w-4" />
            Delete property
          </button>
        </div>
      ) : null}

      {editOpen ? (
        <Modal title="Edit property" onClose={() => setEditOpen(false)}>
          <form action={handleUpdate} className="space-y-3">
            <input type="hidden" name="property_id" value={property.id} />
            <Input name="name" defaultValue={property.name} placeholder="Property name" required />
            <Input name="address" defaultValue={property.address} placeholder="Address" required />
            <Textarea name="access_notes" defaultValue={property.access_notes || ""} placeholder="Optional contractor access instructions" />
            <Textarea name="parking_notes" defaultValue={property.parking_notes || ""} placeholder="Optional contractor parking instructions" />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button variant="secondary" className="w-full" disabled={pending}>
              <Save className="h-4 w-4" />
              {pending ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </Modal>
      ) : null}

      {deleteOpen ? (
        <Modal title="Delete property" onClose={() => setDeleteOpen(false)}>
          <form action={handleDelete} className="space-y-3">
            <input type="hidden" name="property_id" value={property.id} />
            <p className="text-sm text-muted-foreground">
              This removes the property and related tickets. Use this for test data cleanup.
            </p>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="confirm_delete" className="mt-1" />
              Confirm delete
            </label>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button variant="destructive" className="w-full" disabled={pending}>
              <Trash2 className="h-4 w-4" />
              {pending ? "Deleting..." : "Delete property"}
            </Button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onMouseDown={onClose}>
      <div className="w-full max-w-md rounded-lg border bg-white p-4 shadow-xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Close modal">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
