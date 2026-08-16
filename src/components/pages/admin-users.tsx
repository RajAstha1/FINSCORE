'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Card, CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus, Search, Pencil, UserX, Shield, ShieldCheck, Eye, ShieldAlert,
} from 'lucide-react';
import { useAuthStore } from '@/store/use-auth-store';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ROLE_LABELS, type UserRole } from '@/lib/auth';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UserEntry {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar: string | null;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  mfaEnabled: boolean;
  _count: { auditLogs: number; decisions: number; sessions: number };
}

interface UsersData {
  data: UserEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  roleDistribution: Array<{ role: string; count: number }>;
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/40',
  analyst: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800/40',
  partner: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800/40',
  beneficiary: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/40',
  auditor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800/40',
};

const VALID_ROLES: UserRole[] = ['super_admin', 'analyst', 'partner', 'beneficiary', 'auditor'];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminUsersPage() {
  const token = useAuthStore((s) => s.token)!;
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserEntry | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('analyst');
  const [formPassword, setFormPassword] = useState('');

  // Deactivate dialog
  const [deactivateTarget, setDeactivateTarget] = useState<UserEntry | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set('page', String(page));
      sp.set('pageSize', String(pageSize));
      if (search) sp.set('search', search);
      const res = await fetch(`/api/admin/users?${sp.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json() as Promise<UsersData>;
    },
    placeholderData: (prev) => prev,
  });

  const users = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  // Create / Update mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingUser) {
        // Update
        const res = await fetch('/api/admin/users', {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: editingUser.id, name: formName, email: formEmail, role: formRole, password: formPassword || undefined }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Update failed'); }
        return res.json();
      } else {
        // Create
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formName, email: formEmail, password: formPassword, role: formRole }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Create failed'); }
        return res.json();
      }
    },
    onSuccess: () => {
 toast.success(editingUser ? 'User updated successfully' : 'User created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      closeDialog();
    },
    onError: (err) => toast.error(err.message),
  });

  // Deactivate mutation
  const deactivateMutation = useMutation({
    mutationFn: async () => {
      if (!deactivateTarget) return;
      const res = await fetch(`/api/admin/users?userId=${deactivateTarget.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Deactivation failed'); }
      return res.json();
    },
    onSuccess: () => {
 toast.success('User deactivated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setDeactivateTarget(null);
    },
    onError: (err) => toast.error(err.message),
  });

  function openCreateDialog() {
    setEditingUser(null);
    setFormName(''); setFormEmail(''); setFormRole('analyst'); setFormPassword('');
    setDialogOpen(true);
  }

  function openEditDialog(user: UserEntry) {
    setEditingUser(user);
    setFormName(user.name); setFormEmail(user.email); setFormRole(user.role); setFormPassword('');
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false); setEditingUser(null);
  }

  function formatDate(d: string | null) {
    if (!d) return 'Never';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <motion.div
      className="space-y-6 animate-fade-in-up"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <PageHeader
        title="User Management"
        description={`${total} user${total !== 1 ? 's' : ''} total`}
        actions={
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="size-4 mr-1.5" /> Add User
          </Button>
        }
      />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Search users..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
      </div>

      {/* Table */}
      <Card className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : isError ? (
          <EmptyState title="Failed to load users" />
        ) : users.length === 0 ? (
          <EmptyState title="No users found" action={{ label: 'Add User', onClick: openCreateDialog }} />
        ) : (
          <div className="max-h-96 overflow-y-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 bg-card z-10">
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Role</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Last Login</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {users.map((user, idx) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 30 }}
                      className="border-b border-border/50 hover:bg-muted/40 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${ROLE_COLORS[user.role] ?? 'bg-muted'}`}>
                            {user.name?.charAt(0)?.toUpperCase() ?? '?'}
                          </div>
                          <span className="text-sm font-medium">{user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${ROLE_COLORS[user.role] ?? ''}`}>
                          {ROLE_LABELS[user.role as UserRole] ?? user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? 'default' : 'destructive'} className="text-xs">
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(user.lastLoginAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => openEditDialog(user)} disabled={user.id === currentUser?.id}>
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8 text-red-600 dark:text-red-400" onClick={() => setDeactivateTarget(user)} disabled={user.id === currentUser?.id || !user.isActive}>
                            <UserX className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Page <span className="font-mono">{page}</span> of <span className="font-mono">{totalPages}</span>
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="size-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹</Button>
              <Button variant="outline" size="icon" className="size-8" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>›</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Create New User'}</DialogTitle>
            <DialogDescription>{editingUser ? 'Update user details below.' : 'Fill in the details to create a new user.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="user@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VALID_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{editingUser ? 'New Password (leave blank to keep current)' : 'Password'}</Label>
              <Input id="password" type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder={editingUser ? '••••••••' : 'Min 8 characters'} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!formName || !formEmail || (!editingUser && !formPassword) || saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Saving...' : editingUser ? 'Save Changes' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <AlertDialog open={!!deactivateTarget} onOpenChange={(open) => { if (!open) setDeactivateTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate <span className="font-semibold">{deactivateTarget?.name}</span> ({deactivateTarget?.email})? They will be logged out immediately and will not be able to sign in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deactivateMutation.mutate()} disabled={deactivateMutation.isPending}>
              {deactivateMutation.isPending ? 'Deactivating...' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
