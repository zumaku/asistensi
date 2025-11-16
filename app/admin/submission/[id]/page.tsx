"use client";

import { useState, useEffect } from "react";
import { supabase, Submission } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import {
  ArrowLeft,
  Code2,
  Copy,
  Eye,
  Check,
  Maximize,
  Minimize,
  X,
} from "lucide-react";
import { use } from "react";
import { toast } from "sonner";

export default function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (resolvedParams.id) {
      const fetchSubmission = async () => {
        const { data } = await supabase
          .from("submissions")
          .select("*")
          .eq("id", resolvedParams.id)
          .single();

        if (data) setSubmission(data);
        setLoading(false);
      };

      fetchSubmission();
    }
  }, [resolvedParams.id]);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isFullscreen]);

  // Prevent body scroll when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isFullscreen]);

  const handleCopyCode = async () => {
    if (!submission?.code) return;

    try {
      await navigator.clipboard.writeText(submission.code);
      setCopied(true);
      toast.success("Kode berhasil dicopy!", {
        duration: 2000,
      });

      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Gagal copy kode");
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Submission tidak ditemukan</p>
            <Link href="/admin" className="mt-4 inline-block">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali ke Dashboard
              </Button>
            </Link>
          </div>

          {/* Student Info Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code2 className="w-6 h-6" />
                Detail Submission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Nama:</span>
                  <p className="font-semibold">{submission.student_name}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">NIM:</span>
                  <p className="font-semibold">{submission.student_nim}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <p className="font-semibold text-sm break-all">
                    {submission.student_email}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Skor:</span>
                  <p className="font-semibold">
                    {submission.score !== null ? (
                      <Badge
                        className={
                          submission.score >= 80
                            ? "bg-green-600"
                            : submission.score >= 60
                            ? "bg-blue-600"
                            : "bg-red-600"
                        }
                      >
                        {submission.score}/100
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Belum selesai</Badge>
                    )}
                  </p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
                <div>
                  <span className="text-sm text-muted-foreground">
                    Waktu Submit:
                  </span>
                  <p className="font-semibold text-sm">
                    {new Date(submission.created_at).toLocaleString("id-ID", {
                      dateStyle: "full",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">
                    Waktu Selesai:
                  </span>
                  <p className="font-semibold text-sm">
                    {submission.completed_at
                      ? new Date(submission.completed_at).toLocaleString(
                          "id-ID",
                          {
                            dateStyle: "full",
                            timeStyle: "short",
                          }
                        )
                      : "-"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Code & Preview Tabs */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Kode HTML & CSS</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCode}
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Tersalin!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Code
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="code" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                  <TabsTrigger value="code" className="gap-2">
                    <Code2 className="w-4 h-4" />
                    Kode
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="gap-2">
                    <Eye className="w-4 h-4" />
                    Preview
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="code" className="mt-4">
                  <div className="bg-gray-900 rounded-lg p-6 overflow-auto max-h-[600px]">
                    <pre className="text-sm text-gray-100 font-mono whitespace-pre-wrap">
                      <code>{submission.code}</code>
                    </pre>
                  </div>
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">
                      💡 <strong>Tip:</strong> Gunakan tombol Copy Code untuk
                      menyalin kode, atau switch ke tab Preview untuk melihat
                      hasil renderingnya.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="preview" className="mt-4">
                  <div className="border-4 border-gray-300 rounded-lg overflow-hidden bg-white">
                    <div className="bg-gray-800 text-white px-4 py-2 text-sm font-mono flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-500" />
                          <div className="w-3 h-3 rounded-full bg-yellow-500" />
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                        </div>
                        <span className="ml-2">
                          Preview - {submission.student_name}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleFullscreen}
                        className="text-white hover:bg-gray-700 gap-2"
                      >
                        <Maximize className="w-4 h-4" />
                        Fullscreen
                      </Button>
                    </div>
                    <iframe
                      srcDoc={submission.code}
                      title="HTML Preview"
                      className="w-full h-[600px] border-0"
                      sandbox="allow-same-origin"
                    />
                  </div>
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-900">
                      ⚠️ <strong>Catatan:</strong> Preview ini menggunakan
                      iframe dengan sandbox mode untuk keamanan. JavaScript
                      di-disable untuk mencegah kode berbahaya.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {submission.completed_at && (
            <div className="mt-6 flex gap-4 justify-center">
              <Link href={`/result/${submission.id}`}>
                <Button size="lg" className="gap-2">
                  <Eye className="w-5 h-5" />
                  Lihat Hasil & Jawaban
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black">
          {/* Header Bar */}
          <div className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between border-b border-gray-700">
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <span className="font-mono text-sm">
                Preview Fullscreen - {submission.student_name} (
                {submission.student_nim})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="text-white hover:bg-gray-700 gap-2"
              >
                <Minimize className="w-4 h-4" />
                Exit Fullscreen
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="text-white hover:bg-gray-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Fullscreen Iframe */}
          <iframe
            srcDoc={submission.code}
            title="HTML Preview Fullscreen"
            className="w-full h-[calc(100vh-57px)] border-0 bg-white"
            sandbox="allow-same-origin"
          />

          {/* ESC Hint */}
          <div className="absolute bottom-4 right-4 bg-gray-900/90 text-white px-4 py-2 rounded-lg text-sm font-mono backdrop-blur-sm border border-gray-700">
            Press <kbd className="px-2 py-1 bg-gray-700 rounded">ESC</kbd> to
            exit fullscreen
          </div>
        </div>
      )}
    </>
  );
}
