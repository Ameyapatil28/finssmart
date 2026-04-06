import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, Loader2, Target, Check } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

interface SavingsGoal {
  id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  monthly_contribution: number;
  status: string;
}

export default function SavingsGoals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    goal_name: "",
    target_amount: "",
    current_amount: "0",
    target_date: "",
    monthly_contribution: "",
  });

  useEffect(() => {
    if (user) loadGoals();
  }, [user]);

  const loadGoals = async () => {
    setLoading(true);
    const { data } = await supabase.from("savings_goals").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
    setGoals((data ?? []).map((g) => ({ ...g, target_amount: Number(g.target_amount), current_amount: Number(g.current_amount), monthly_contribution: Number(g.monthly_contribution) })));
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.goal_name || !form.target_amount || !form.target_date) return;
    setSubmitting(true);
    await supabase.from("savings_goals").insert({
      user_id: user!.id,
      goal_name: form.goal_name,
      target_amount: parseFloat(form.target_amount),
      current_amount: parseFloat(form.current_amount),
      target_date: form.target_date,
      monthly_contribution: parseFloat(form.monthly_contribution || "0"),
    });
    toast({ title: "Goal created!" });
    setForm({ goal_name: "", target_amount: "", current_amount: "0", target_date: "", monthly_contribution: "" });
    setOpen(false);
    loadGoals();
    setSubmitting(false);
  };

  const updateAmount = async (id: string, newAmount: number, targetAmount: number) => {
    const status = newAmount >= targetAmount ? "achieved" : "active";
    await supabase.from("savings_goals").update({ current_amount: newAmount, status }).eq("id", id);
    toast({ title: status === "achieved" ? "🎉 Goal achieved!" : "Progress updated" });
    loadGoals();
  };

  const deleteGoal = async (id: string) => {
    await supabase.from("savings_goals").delete().eq("id", id);
    toast({ title: "Goal deleted" });
    loadGoals();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Savings Goals</h1>
          <p className="text-muted-foreground">Track progress towards your financial targets</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Goal</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Savings Goal</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Goal Name</Label><Input value={form.goal_name} onChange={(e) => setForm({ ...form, goal_name: e.target.value })} placeholder="e.g. Emergency Fund" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Target Amount (₹)</Label><Input type="number" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} placeholder="100000" /></div>
                <div className="space-y-2"><Label>Current Amount (₹)</Label><Input type="number" value={form.current_amount} onChange={(e) => setForm({ ...form, current_amount: e.target.value })} placeholder="0" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Target Date</Label><Input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} /></div>
                <div className="space-y-2"><Label>Monthly Contribution (₹)</Label><Input type="number" value={form.monthly_contribution} onChange={(e) => setForm({ ...form, monthly_contribution: e.target.value })} placeholder="5000" /></div>
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Goal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {goals.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No savings goals yet. Create one to start tracking!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((g) => {
            const progress = Math.min(100, (g.current_amount / g.target_amount) * 100);
            return (
              <Card key={g.id} className="glass-card">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-lg">{g.goal_name}</h3>
                      <p className="text-xs text-muted-foreground">Target: {formatDate(g.target_date)}</p>
                    </div>
                    <div className="flex gap-1">
                      <Badge className={g.status === "achieved" ? "bg-success/20 text-success" : "bg-primary/20 text-primary"}>
                        {g.status === "achieved" && <Check className="h-3 w-3 mr-1" />}
                        {g.status}
                      </Badge>
                      <Button variant="ghost" size="icon" onClick={() => deleteGoal(g.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-mono-number">{formatCurrency(g.current_amount)}</span>
                      <span className="text-muted-foreground font-mono-number">{formatCurrency(g.target_amount)}</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                    <p className="text-xs text-muted-foreground mt-1 text-right font-mono-number">{progress.toFixed(1)}%</p>
                  </div>
                  {g.status === "active" && (
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Add amount"
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const val = parseFloat((e.target as HTMLInputElement).value);
                            if (val > 0) { updateAmount(g.id, g.current_amount + val, g.target_amount); (e.target as HTMLInputElement).value = ""; }
                          }
                        }}
                      />
                      <p className="text-xs text-muted-foreground self-center">Monthly: {formatCurrency(g.monthly_contribution)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
