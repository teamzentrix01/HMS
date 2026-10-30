"use client";
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Hash, CheckCircle2, Sparkles } from "lucide-react";

export default function NumberingRulesPage() {
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRules = async () => {
    try {
      const res = await fetch("/api/admin/numbering");
      const d = await res.json();
      setRules(d.rules || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleUpdate = async (rule) => {
    try {
      await fetch("/api/admin/numbering", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rule),
      });
      alert(`Updated numbering rule for ${rule.entityType}`);
      fetchRules();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Automated Numbering & Identifier Sequences
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Module 1: UHID generation format, clinical encounters, sample barcode prefixes, and billing invoice sequences
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entity Identifier</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead>Format Template</TableHead>
                <TableHead>Current Sequence</TableHead>
                <TableHead>Generated Preview</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => {
                const year = new Date().getFullYear();
                const seq = String(rule.currentSequence).padStart(rule.padLength, "0");
                const preview = rule.formatTemplate
                  .replace("{YYYY}", year)
                  .replace("{SEQ}", seq);

                return (
                  <TableRow key={rule.id}>
                    <TableCell className="font-bold text-slate-900 text-xs">
                      {rule.entityType}
                    </TableCell>
                    <TableCell>
                      <input
                        type="text"
                        value={rule.prefix}
                        onChange={(e) =>
                          setRules(
                            rules.map((r) =>
                              r.id === rule.id ? { ...r, prefix: e.target.value } : r
                            )
                          )
                        }
                        className="w-20 rounded border border-slate-300 px-2 py-1 text-xs font-mono font-bold"
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="text"
                        value={rule.formatTemplate}
                        onChange={(e) =>
                          setRules(
                            rules.map((r) =>
                              r.id === rule.id
                                ? { ...r, formatTemplate: e.target.value }
                                : r
                            )
                          )
                        }
                        className="w-48 rounded border border-slate-300 px-2 py-1 text-xs font-mono"
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {rule.currentSequence}
                    </TableCell>
                    <TableCell>
                      <Badge variant="teal" className="font-mono text-xs">
                        {preview}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdate(rule)}
                      >
                        Save
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

