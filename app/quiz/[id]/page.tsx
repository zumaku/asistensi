'use client';

import { useState, useEffect } from 'react';
import { supabase, Submission, Question } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, AlertCircle, Send, CheckCircle2, ShieldAlert } from 'lucide-react';
import { use } from 'react';
import { toast } from 'sonner';

export default function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0); // ✅ Track tab switches

  useEffect(() => {
    if (resolvedParams.id) {
      fetchSubmission();
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // ✅ Proteksi Anti-Cheat
  useEffect(() => {
    // Disable right click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast.error('Klik kanan dinonaktifkan selama tes', {
        duration: 2000,
      });
    };

    // Detect copy/paste
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.error('Copy text dinonaktifkan selama tes', {
        duration: 2000,
      });
    };

    // Detect tab switch / window blur
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => {
          const newCount = prev + 1;
          toast.warning(`Peringatan: Jangan pindah tab/window! (${newCount}x)`, {
            duration: 3000,
            icon: <ShieldAlert className="h-5 w-5" />,
          });
          
          if (newCount >= 3) {
            toast.error('Terlalu banyak pindah tab! Tes akan otomatis disubmit.', {
              duration: 5000,
            });
            setTimeout(() => {
              handleSubmit();
            }, 2000);
          }
          
          return newCount;
        });
      }
    };

    // Detect keyboard shortcuts (Ctrl+C, Ctrl+A, dll)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Ctrl+C, Ctrl+A, Ctrl+X, Ctrl+U, F12
      if (
        (e.ctrlKey && (e.key === 'c' || e.key === 'a' || e.key === 'x' || e.key === 'u')) ||
        e.key === 'F12'
      ) {
        e.preventDefault();
        toast.error('Shortcut keyboard dinonaktifkan', {
          duration: 2000,
        });
      }
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const fetchSubmission = async () => {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('id', resolvedParams.id)
        .single();

      if (error) {
        console.error('Supabase error:', error);
        alert('Submission tidak ditemukan: ' + error.message);
        router.push('/');
        return;
      }

      if (!data) {
        alert('Submission tidak ditemukan');
        router.push('/');
        return;
      }

      if (data.completed_at) {
        router.push(`/result/${resolvedParams.id}`);
        return;
      }

      setSubmission(data);
      setAnswers(new Array(data.questions.length).fill(-1));

      // Hitung sisa waktu
      const startTime = new Date(data.started_at).getTime();
      const now = new Date().getTime();
      const elapsed = Math.floor((now - startTime) / 1000);
      const limit = data.time_limit_minutes * 60;
      const remaining = limit - elapsed;

      if (remaining <= 0) {
        handleSubmit();
      } else {
        setTimeLeft(remaining);
      }

      setLoading(false);
    } catch (err) {
      console.error('Fetch error:', err);
      alert('Terjadi kesalahan saat memuat data');
      router.push('/');
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/submit-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: resolvedParams.id,
          answers,
        }),
      });

      if (res.ok) {
        router.push(`/result/${resolvedParams.id}`);
      } else {
        alert('Gagal submit jawaban');
      }
    } catch (error) {
      alert('Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeLeft < 300) return 'text-red-600';
    if (timeLeft < 600) return 'text-amber-600';
    return 'text-blue-600';
  };

  const answeredCount = answers.filter((a) => a !== -1).length;
  const progress = (answeredCount / (submission?.questions.length || 1)) * 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="w-64">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <p className="text-sm text-muted-foreground">Memuat soal...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const questions = submission?.questions as Question[];

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4 select-none"
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
      }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Anti-Cheat Warning */}
        {tabSwitchCount > 0 && (
          <Alert className="mb-4 border-red-500 bg-red-50">
            <ShieldAlert className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-900">
              <strong>Peringatan!</strong> Anda telah pindah tab/window sebanyak{' '}
              <strong>{tabSwitchCount} kali</strong>. Jika lebih dari 3 kali, tes akan otomatis disubmit.
            </AlertDescription>
          </Alert>
        )}

        {/* Header with Timer */}
        <Card className="mb-6 shadow-lg border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Quiz CSS Dasar</h1>
                <p className="text-sm text-muted-foreground">
                  Jawab semua soal berdasarkan pemahaman Anda
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className={`h-5 w-5 ${getTimeColor()}`} />
                  <span className="text-sm text-muted-foreground">Sisa Waktu</span>
                </div>
                <div className={`text-4xl font-bold ${getTimeColor()}`}>
                  {formatTime(timeLeft)}
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Progress Pengerjaan</span>
                <span className="font-medium">
                  {answeredCount} / {questions?.length} Soal
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Info Box */}
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 text-sm">
            <strong>Mode Tes Aktif:</strong> Seleksi teks, copy, dan klik kanan dinonaktifkan.
            Jangan pindah tab/window atau tes akan otomatis disubmit.
          </AlertDescription>
        </Alert>

        {/* Questions */}
        <div className="space-y-4">
          {questions?.map((q, qIndex) => (
            <Card key={qIndex} className="shadow-md border-0">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="text-lg leading-relaxed">
                    <span className="text-blue-600 font-bold">#{qIndex + 1}</span> {q.question}
                  </CardTitle>
                  {answers[qIndex] !== -1 && (
                    <Badge variant="secondary" className="flex-shrink-0">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Terjawab
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={answers[qIndex]?.toString()}
                  onValueChange={(value) => {
                    const newAnswers = [...answers];
                    newAnswers[qIndex] = parseInt(value);
                    setAnswers(newAnswers);
                  }}
                  className="space-y-3"
                >
                  {q.options.map((option, oIndex) => (
                    <div
                      key={oIndex}
                      className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                        answers[qIndex] === oIndex
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <RadioGroupItem value={oIndex.toString()} id={`q${qIndex}-o${oIndex}`} className="mt-0.5" />
                      <Label
                        htmlFor={`q${qIndex}-o${oIndex}`}
                        className="flex-1 cursor-pointer leading-relaxed"
                      >
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Submit Section */}
        <Card className="mt-6 shadow-lg border-0">
          <CardContent className="pt-6">
            {answers.some((a) => a === -1) && (
              <Alert className="mb-4 border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  Harap jawab semua soal sebelum submit. Masih ada{' '}
                  <strong>{questions?.length - answeredCount} soal</strong> yang belum dijawab.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{answeredCount}</span> dari{' '}
                <span className="font-medium text-foreground">{questions?.length}</span> soal telah dijawab
              </div>
              <Button
                onClick={handleSubmit}
                disabled={submitting || answers.some((a) => a === -1)}
                size="lg"
                className="min-w-[200px]"
              >
                {submitting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-5 w-5" />
                    Submit Jawaban
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}