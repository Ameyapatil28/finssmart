import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-advisor`;

interface AIAdvisorParams {
  riskProfile: { risk_score: number; risk_category: string } | null;
  holdings: any[];
  transactions: any[];
}

export function useAIAdvisor({ riskProfile, holdings, transactions }: AIAdvisorParams) {
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getAdvice = async (query?: string) => {
    setLoading(true);
    setResponse("");

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ riskProfile, holdings, transactions, query }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "AI service error" }));
        toast({ title: err.error || "Failed to get advice", variant: "destructive" });
        setLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              full += content;
              setResponse(full);
            }
          } catch { /* partial JSON, skip */ }
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to connect to AI", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return { response, loading, getAdvice };
}
