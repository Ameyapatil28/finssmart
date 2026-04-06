import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit, Loader2, RefreshCw } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

const INCOME_CATEGORIES = ["Salary", "Freelance", "Business", "Dividends", "Other Income"];
const EXPENSE_CATEGORIES = ["Rent", "Food", "Transport", "Shopping", "Medical", "Education", "Entertainment", "SIP/Investment", "Utilities", "Other"];
const PAYMENT_METHODS = ["UPI", "Cash", "Card", "NetBanking"];

interface Transaction {
  id: string;
  type: string;
  amount: number;
  category: string;
  description: string | null;
  transaction_date: string;
  payment_method: string | null;
  is_recurring: boolean;
}

export default function Transactions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    type: "expense" as string,
    amount: "",
    category: "",
    description: "",
    transaction_date: new Date().toISOString().split("T")[0],
    payment_method: "UPI",
    is_recurring: false,
  });

  useEffect(() => {
    if (user) loadTxns();
  }, [user, filterType]);

  const loadTxns = async () => {
    setLoading(true);
    let query = supabase.from("transactions").select("*").eq("user_id", user!.id).order("transaction_date", { ascending: false });
    if (filterType !== "all") query = query.eq("type", filterType);
    const { data } = await query;
    setTxns((data as Transaction[]) ?? []);
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ type: "expense", amount: "", category: "", description: "", transaction_date: new Date().toISOString().split("T")[0], payment_method: "UPI", is_recurring: false });
    setEditId(null);
  };

  const handleSubmit = async () => {
    if (!form.amount || !form.category) return;
    setSubmitting(true);
    try {
      if (editId) {
        await supabase.from("transactions").update({ type: form.type, amount: parseFloat(form.amount), category: form.category, description: form.description, transaction_date: form.transaction_date, payment_method: form.payment_method, is_recurring: form.is_recurring }).eq("id", editId);
        toast({ title: "Transaction updated" });
      } else {
        await supabase.from("transactions").insert({ user_id: user!.id, type: form.type, amount: parseFloat(form.amount), category: form.category, description: form.description, transaction_date: form.transaction_date, payment_method: form.payment_method, is_recurring: form.is_recurring });
        toast({ title: "Transaction added" });
      }
      resetForm();
      setOpen(false);
      loadTxns();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  const handleEdit = (t: Transaction) => {
    setForm({ type: t.type, amount: String(t.amount), category: t.category, description: t.description ?? "", transaction_date: t.transaction_date, payment_method: t.payment_method ?? "UPI", is_recurring: t.is_recurring });
    setEditId(t.id);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("transactions").delete().eq("id", id);
    toast({ title: "Transaction deleted" });
    loadTxns();
  };

  const totalIncome = txns.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = txns.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const categories = form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">Track your income and expenses</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Add</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Transaction</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, category: "" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (₹)</Label>
                    <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_recurring} onCheckedChange={(v) => setForm({ ...form, is_recurring: v })} />
                  <Label>Recurring</Label>
                </div>
                <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editId ? "Update" : "Add"} Transaction
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="glass-card"><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Income</p><p className="text-lg font-bold font-mono-number text-success">{formatCurrency(totalIncome)}</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Expense</p><p className="text-lg font-bold font-mono-number text-destructive">{formatCurrency(totalExpense)}</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Net</p><p className={`text-lg font-bold font-mono-number ${totalIncome - totalExpense >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(totalIncome - totalExpense)}</p></CardContent></Card>
      </div>

      {/* Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : txns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No transactions yet. Add your first one!</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txns.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">{formatDate(t.transaction_date)}{t.is_recurring && <RefreshCw className="inline ml-1 h-3 w-3 text-muted-foreground" />}</TableCell>
                    <TableCell><Badge variant={t.type === "income" ? "default" : "destructive"} className={t.type === "income" ? "bg-success/20 text-success border-success/30" : ""}>{t.type}</Badge></TableCell>
                    <TableCell>{t.category}</TableCell>
                    <TableCell className={`font-mono-number font-medium ${t.type === "income" ? "text-success" : "text-destructive"}`}>{t.type === "income" ? "+" : "-"}{formatCurrency(Number(t.amount))}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{t.payment_method}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(t)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
