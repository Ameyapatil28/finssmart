import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Brain, Calculator, Sparkles, Send } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { useAIAdvisor } from "@/hooks/useAIAdvisor";

const QUIZ_QUESTIONS = [
  { q: "What is your investment experience?", options: ["None", "Beginner (< 1 year)", "Intermediate (1-3 years)", "Advanced (3-5 years)", "Expert (5+ years)"] },
  { q: "If your portfolio dropped 20% in a month, you would:", options: ["Sell everything immediately", "Sell some holdings", "Hold and wait", "Buy more at lower prices", "Aggressively buy the dip"] },
  { q: "What is your investment timeline?", options: ["< 1 year", "1-3 years", "3-5 years", "5-10 years", "10+ years"] },
  { q: "How stable is your monthly income?", options: ["Very unstable", "Somewhat unstable", "Average", "Stable", "Very stable with multiple sources"] },
  { q: "What is your primary investment goal?", options: ["Capital preservation", "Regular income", "Balanced growth", "Aggressive growth", "Maximum returns at any risk"] },
];

const ALLOCATIONS: Record<string, { equity: number; debt: number; gold: number }> = {
  conservative: { equity: 30, debt: 50, gold: 20 },
  moderate: { equity: 60, debt: 30, gold: 10 },
  aggressive: { equity: 80, debt: 10, gold: 10 },
};

export default function AIAdvisor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [answers, setAnswers] = useState<number[]>(Array(5).fill(-1));
  const [riskProfile, setRiskProfile] = useState<{ risk_score: number; risk_category: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sipMonthly, setSipMonthly] = useState("10000");
  const [sipYears, setSipYears] = useState("10");
  const [sipReturn, setSipReturn] = useState("12");
  const [holdings, setHoldings] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [customQuery, setCustomQuery] = useState("");

  const { response: aiResponse, loading: aiLoading, getAdvice } = useAIAdvisor({
    riskProfile, holdings, transactions,
  });

  useEffect(() => {
    if (user) {
      loadRiskProfile();
      loadUserData();
    }
  }, [user]);

  const loadRiskProfile = async () => {
    const { data } = await supabase.from("risk_profiles").select("*").eq("user_id", user!.id).maybeSingle();
    if (data) setRiskProfile({ risk_score: data.risk_score, risk_category: data.risk_category });
  };

  const loadUserData = async () => {
    const [h, t] = await Promise.all([
      supabase.from("holdings").select("symbol, quantity, avg_buy_price, asset_type").eq("user_id", user!.id),
      supabase.from("transactions").select("amount, category, type").eq("user_id", user!.id).order("transaction_date", { ascending: false }).limit(20),
    ]);
    if (h.data) setHoldings(h.data);
    if (t.data) setTransactions(t.data);
  };

  const submitQuiz = async () => {
    if (answers.some((a) => a === -1)) {
      toast({ title: "Please answer all questions", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const totalScore = answers.reduce((s, a) => s + (a + 1), 0);
    const avgScore = totalScore / answers.length;
    const riskScore = Math.round(avgScore * 2);
    const riskCategory = riskScore <= 4 ? "conservative" : riskScore <= 7 ? "moderate" : "aggressive";

    const { data: existing } = await supabase.from("risk_profiles").select("id").eq("user_id", user!.id).maybeSingle();
    if (existing) {
      await supabase.from("risk_profiles").update({ risk_score: riskScore, risk_category: riskCategory }).eq("user_id", user!.id);
    } else {
      await supabase.from("risk_profiles").insert({ user_id: user!.id, risk_score: riskScore, risk_category: riskCategory });
    }

    const profile = { risk_score: riskScore, risk_category: riskCategory };
    setRiskProfile(profile);
    toast({ title: "Risk profile saved!" });
    setSubmitting(false);
  };

  // SIP Calculator
  const P = parseFloat(sipMonthly) || 0;
  const r = (parseFloat(sipReturn) || 0) / 100;
  const n = 12;
  const t = parseFloat(sipYears) || 0;
  const rn = r / n;
  const sipFV = rn > 0 ? P * ((Math.pow(1 + rn, n * t) - 1) / rn) * (1 + rn) : P * n * t;

  const category = riskProfile?.risk_category ?? "moderate";
  const allocation = ALLOCATIONS[category];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Advisor</h1>
        <p className="text-muted-foreground">Get personalised investment recommendations powered by AI</p>
      </div>

      {/* AI Recommendations */}
      <Card className="glass-card border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" /> AI-Powered Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ask anything... e.g. 'Best SIP funds for 5 years'"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !aiLoading && getAdvice(customQuery || undefined)}
            />
            <Button onClick={() => getAdvice(customQuery || undefined)} disabled={aiLoading} size="icon" className="shrink-0">
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Top 5 stocks for me", "Best mutual funds", "Tax saving options", "Portfolio review"].map((q) => (
              <Button key={q} variant="outline" size="sm" onClick={() => { setCustomQuery(q); getAdvice(q); }} disabled={aiLoading} className="text-xs">
                {q}
              </Button>
            ))}
          </div>
          {aiResponse && (
            <div className="p-4 rounded-lg bg-muted/50 prose prose-sm prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
              {aiResponse}
            </div>
          )}
          {!aiResponse && !aiLoading && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Click a suggestion or type your question to get AI-powered investment advice based on your profile
            </p>
          )}
        </CardContent>
      </Card>

      {/* Risk Profile Section */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" /> Risk Profile Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {riskProfile && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <Badge className={`text-sm px-3 py-1 ${
                riskProfile.risk_category === "conservative" ? "bg-primary/20 text-primary" :
                riskProfile.risk_category === "moderate" ? "bg-warning/20 text-warning" :
                "bg-destructive/20 text-destructive"
              }`}>
                {riskProfile.risk_category.toUpperCase()}
              </Badge>
              <span className="text-sm text-muted-foreground">Risk Score: {riskProfile.risk_score}/10</span>
            </div>
          )}

          {QUIZ_QUESTIONS.map((q, qi) => (
            <div key={qi} className="space-y-3">
              <p className="font-medium text-sm">{qi + 1}. {q.q}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {q.options.map((opt, oi) => (
                  <button
                    key={oi}
                    onClick={() => { const newA = [...answers]; newA[qi] = oi; setAnswers(newA); }}
                    className={`text-left text-sm p-3 rounded-lg border transition-colors ${
                      answers[qi] === oi
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <Button onClick={submitQuiz} disabled={submitting} className="w-full">
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Assessment
          </Button>
        </CardContent>
      </Card>

      {/* Allocation */}
      {riskProfile && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Suggested Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Equity", value: allocation.equity, color: "bg-primary" },
                { label: "Debt", value: allocation.debt, color: "bg-success" },
                { label: "Gold", value: allocation.gold, color: "bg-warning" },
              ].map((a) => (
                <div key={a.label} className="text-center space-y-2">
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${a.color} rounded-full`} style={{ width: `${a.value}%` }} />
                  </div>
                  <p className="text-sm font-medium">{a.label}</p>
                  <p className="text-2xl font-bold font-mono-number">{a.value}%</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SIP Calculator */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5 text-primary" /> SIP Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Monthly SIP (₹)</Label>
              <Input type="number" value={sipMonthly} onChange={(e) => setSipMonthly(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Duration (years)</Label>
              <Input type="number" value={sipYears} onChange={(e) => setSipYears(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Expected Return (%)</Label>
              <Input type="number" value={sipReturn} onChange={(e) => setSipReturn(e.target.value)} />
            </div>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <p className="text-sm text-muted-foreground mb-1">Projected Corpus</p>
            <p className="text-3xl font-bold font-mono-number text-gradient">{formatCurrency(sipFV)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Total Investment: {formatCurrency(P * 12 * t)} | Wealth Gain: {formatCurrency(sipFV - P * 12 * t)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
