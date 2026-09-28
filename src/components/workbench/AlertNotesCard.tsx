import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StickyNote, Loader2, PlusCircle } from 'lucide-react';
import { useAlertNotes, useAddAlertNote } from '@/hooks/useAlerts';
import { format } from 'date-fns';

interface AlertNotesCardProps {
  alertId: string;
}

/**
 * Notes for a single alert, backed by GET/POST /api/alerts/{id}/notes.
 * Any user with alerts:read can add notes.
 */
export function AlertNotesCard({ alertId }: AlertNotesCardProps) {
  const [newNote, setNewNote] = useState('');
  const { data: notes = [], isLoading, error } = useAlertNotes(alertId);
  const addNote = useAddAlertNote();

  const handleAdd = () => {
    if (!newNote.trim()) return;
    addNote.mutate({ alertId, note: newNote.trim() }, { onSuccess: () => setNewNote('') });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <StickyNote className="h-5 w-5 text-primary" />
          Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading notes…</span>
          </div>
        ) : error ? (
          <p className="text-sm text-destructive py-2">Failed to load notes.</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No notes yet.</p>
        ) : (
          <div className="space-y-3">
            {notes.map((n: any) => (
              <div key={n.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{n.full_name || n.username || 'User'}</span>
                  <span className="text-xs text-muted-foreground">
                    {n.created_at ? format(new Date(n.created_at), 'MMM dd, yyyy HH:mm') : ''}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{n.note}</p>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <Textarea
            placeholder="Add a note…"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="min-h-[80px]"
          />
          <Button onClick={handleAdd} disabled={!newNote.trim() || addNote.isPending} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            {addNote.isPending ? 'Adding…' : 'Add Note'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
