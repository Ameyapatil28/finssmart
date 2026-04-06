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
import { Plus, Trash2, Loader2, Briefcase, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

interface Holding {
  id: string;
  portfolio_id: string;
  symbol: string;
  asset_type: string;
  quantity: number;
  avg_buy_price: number;
  buy_date: string;
  notes: string | null;
}

interface Portfolio {
  id: string;
  portfolio_name: string;
  holdings: Holding[];
}

export default function PortfolioPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPortfolioName, setNewPortfolioName] = useState("");
  const [portfolioDialogOpen, setPortfolioDialogOpen] = useState(false);
  const [holdingDialogOpen, setHoldingDialogOpen] = useState(false);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [holdingForm, setHoldingForm] = useState({
    symbol: "",
    asset_type: "stock",
    quantity: "",
    avg_buy_price: "",
    buy_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useEffect(() => {
    if (user) loadPortfolios();
  }, [user]);

  const loadPortfolios = async () => {
    setLoading(true);
    const { data: portfolioData } = await supabase.from("portfolios").select("*").eq("user_id", user!.id);
    const { data: holdingsData } = await supabase.from("holdings").select("*").eq("user_id", user!.id);

    const mapped: Portfolio[] = (portfolioData ?? []).map((p) => ({
      id: p.id,
      portfolio_name: p.portfolio_name,
      holdings: (holdingsData ?? []).filter((h) => h.portfolio_id === p.id).map((h) => ({
        ...h,
        quantity: Number(h.quantity),
        avg_buy_price: Number(h.avg_buy_price),
      })),
    }));
    setPortfolios(mapped);
    setLoading(false);
  };

  const createPortfolio = async () => {
    if (!newPortfolioName.trim()) return;
    setSubmitting(true);
    await supabase.from("portfolios").insert({ user_id: user!.id, portfolio_name: newPortfolioName.trim() });
    toast({ title: "Portfolio created" });
    setNewPortfolioName("");
    setPortfolioDialogOpen(false);
    loadPortfolios();
    setSubmitting(false);
  };

  const deletePortfolio = async (id: string) => {
    await supabase.from("portfolios").delete().eq("id", id);
    toast({ title: "Portfolio deleted" });
    loadPortfolios();
  };

  const addHolding = async () => {
    if (!holdingForm.symbol || !holdingForm.quantity || !holdingForm.avg_buy_price) return;
    setSubmitting(true);
    await supabase.from("holdings").insert({
      portfolio_id: selectedPortfolioId,
      user_id: user!.id,
      symbol: holdingForm.symbol.toUpperCase(),
      asset_type: holdingForm.asset_type,
      quantity: parseFloat(holdingForm.quantity),
      avg_buy_price: parseFloat(holdingForm.avg_buy_price),
      buy_date: holdingForm.buy_date,
      notes: holdingForm.notes,
    });
    toast({ title: "Holding added" });
    setHoldingForm({ symbol: "", asset_type: "stock", quantity: "", avg_buy_price: "", buy_date: new Date().toISOString().split("T")[0], notes: "" });
    setHoldingDialogOpen(false);
    loadPortfolios();
    setSubmitting(false);
  };

  const deleteHolding = async (id: string) => {
    await supabase.from("holdings").delete().eq("id", id);
    toast({ title: "Holding removed" });
    loadPortfolios();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Portfolio</h1>
          <p className="text-muted-foreground">Manage your investments</p>
        </div>
        <Dialog open={portfolioDialogOpen} onOpenChange={setPortfolioDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Portfolio</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Portfolio</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Portfolio Name</Label>
                <Input value={newPortfolioName} onChange={(e) => setNewPortfolioName(e.target.value)} placeholder="e.g. Growth Portfolio" />
              </div>
              <Button className="w-full" onClick={createPortfolio} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {portfolios.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No portfolios yet. Create one to start tracking your investments.</p>
          </CardContent>
        </Card>
      ) : (
        portfolios.map((p) => {
          const totalInvested = p.holdings.reduce((s, h) => s + h.quantity * h.avg_buy_price, 0);
          return (
            <Card key={p.id} className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{p.portfolio_name}</CardTitle>
                  <p className="text-sm text-muted-foreground font-mono-number">Invested: {formatCurrency(totalInvested)}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { setSelectedPortfolioId(p.id); setHoldingDialogOpen(true); }}>
                    <Plus className="h-3 w-3 mr-1" /> Add Holding
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deletePortfolio(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardHeader>
              {p.holdings.length > 0 && (
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Avg Price</TableHead>
                        <TableHead>Invested</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {p.holdings.map((h) => (
                        <TableRow key={h.id}>
                          <TableCell className="font-medium font-mono-number">{h.symbol}</TableCell>
                          <TableCell><Badge variant="secondary">{h.asset_type}</Badge></TableCell>
                          <TableCell className="font-mono-number">{h.quantity}</TableCell>
                          <TableCell className="font-mono-number">{formatCurrency(h.avg_buy_price)}</TableCell>
                          <TableCell className="font-mono-number">{formatCurrency(h.quantity * h.avg_buy_price)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => deleteHolding(h.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              )}
            </Card>
          );
        })
      )}

      {/* Add Holding Dialog */}
      <Dialog open={holdingDialogOpen} onOpenChange={setHoldingDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Holding</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Symbol</Label>
                <Input value={holdingForm.symbol} onChange={(e) => setHoldingForm({ ...holdingForm, symbol: e.target.value })} placeholder="e.g. INFY.NS" />
              </div>
              <div className="space-y-2">
                <Label>Asset Type</Label>
                <Select value={holdingForm.asset_type} onValueChange={(v) => setHoldingForm({ ...holdingForm, asset_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stock">Stock</SelectItem>
                    <SelectItem value="etf">ETF</SelectItem>
                    <SelectItem value="mutual_fund">Mutual Fund</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="fd">FD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" value={holdingForm.quantity} onChange={(e) => setHoldingForm({ ...holdingForm, quantity: e.target.value })} placeholder="10" />
              </div>
              <div className="space-y-2">
                <Label>Avg Buy Price (₹)</Label>
                <Input type="number" value={holdingForm.avg_buy_price} onChange={(e) => setHoldingForm({ ...holdingForm, avg_buy_price: e.target.value })} placeholder="1450" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Buy Date</Label>
              <Input type="date" value={holdingForm.buy_date} onChange={(e) => setHoldingForm({ ...holdingForm, buy_date: e.target.value })} />
            </div>
            <Button className="w-full" onClick={addHolding} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Holding
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
