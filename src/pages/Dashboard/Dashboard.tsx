import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { DollarSign, TrendingDown, TrendingUp, Wallet, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(217, 91%, 60%)", "hsl(160, 84%, 39%)", "hsl(0, 84%, 60%)", "hsl(38, 92%, 50%)", "hsl(280, 65%, 60%)", "hsl(200, 70%, 50%)"];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ income: 0, expense: 0, savings: 0, portfolioValue: 0 });
  const [categoryData, setCategoryData] = useState<{ name: string; value: number }[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; income: number; expense: number }[]>([]);
  const [goals, setGoals] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    // Fetch this month's transactions
    const { data: txns } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user!.id)
      .gte("transaction_date", startOfMonth)
      .lte("transaction_date", endOfMonth);

    const income = txns?.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0) ?? 0;
    const expense = txns?.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0) ?? 0;

    // Category breakdown for expenses
    const catMap: Record<string, number> = {};
    txns?.filter((t) => t.type === "expense").forEach((t) => {
      catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount);
    });
    setCategoryData(Object.entries(catMap).map(([name, value]) => ({ name, value })));

    // Portfolio value
    const { data: holdings } = await supabase.from("holdings").select("*").eq("user_id", user!.id);
    const portfolioValue = holdings?.reduce((s, h) => s + Number(h.quantity) * Number(h.avg_buy_price), 0) ?? 0;

    setStats({ income, expense, savings: income - expense, portfolioValue });

    // Monthly data (last 6 months)
    const months: { month: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = d.toISOString().split("T")[0];
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
      const mTxns = txns?.filter((t) => t.transaction_date >= start && t.transaction_date <= end) ?? [];
      months.push({
        month: d.toLocaleString("en", { month: "short" }),
        income: mTxns.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0),
        expense: mTxns.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0),
      });
    }
    setMonthlyData(months);

    // Savings goals
    const { data: goalsData } = await supabase.from("savings_goals").select("*").eq("user_id", user!.id);
    setGoals(goalsData ?? []);
  };

  const summaryCards = [
    { title: "Total Income", value: stats.income, icon: DollarSign, color: "text-success" },
    { title: "Total Expense", value: stats.expense, icon: TrendingDown, color: "text-destructive" },
    { title: "Net Savings", value: stats.savings, icon: TrendingUp, color: stats.savings >= 0 ? "text-success" : "text-destructive" },
    { title: "Portfolio Value", value: stats.portfolioValue, icon: Wallet, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Your financial overview at a glance</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className="glass-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className={`text-2xl font-bold font-mono-number ${card.color}`}>
                    {formatCurrency(card.value)}
                  </p>
                </div>
                <card.icon className={`h-8 w-8 ${card.color} opacity-60`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Income vs Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="income" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No expense data yet. Add transactions to see breakdown.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Savings Goals */}
      {goals.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" /> Savings Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {goals.map((goal) => {
              const progress = Math.min(100, (Number(goal.current_amount) / Number(goal.target_amount)) * 100);
              return (
                <div key={goal.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{goal.goal_name}</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(Number(goal.current_amount))} / {formatCurrency(Number(goal.target_amount))}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
