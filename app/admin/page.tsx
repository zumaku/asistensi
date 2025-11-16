'use client';

import { useState, useEffect } from 'react';
import { supabase, Submission, Class } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Eye, Code2, FileText, Users } from 'lucide-react';

export default function AdminPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClasses = async () => {
        const { data } = await supabase.from('classes').select('*').order('name');
        if (data) setClasses(data);
    };

    const fetchSubmissions = async () => {
        setLoading(true);
        let query = supabase
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: false });

        if (selectedClass !== 'all') {
        query = query.eq('class_id', selectedClass);
        }

        const { data } = await query;
        if (data) setSubmissions(data);
        setLoading(false);
    };

    fetchClasses();
    fetchSubmissions();
  }, [selectedClass]);

  const getScoreBadge = (score: number | null) => {
    if (score === null) return <Badge variant="secondary">Belum Selesai</Badge>;
    if (score >= 80) return <Badge className="bg-green-600">A ({score})</Badge>;
    if (score >= 70) return <Badge className="bg-blue-600">B ({score})</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-600">C ({score})</Badge>;
    return <Badge variant="destructive">D/E ({score})</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Review submission mahasiswa</p>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Filter Kelas</label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Kelas</SelectItem>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {submissions.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Submission</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="space-y-4">
            {submissions.map((sub) => (
              <Card key={sub.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{sub.student_name}</h3>
                        {getScoreBadge(sub.score)}
                        {!sub.completed_at && (
                          <Badge variant="outline" className="bg-yellow-50">
                            🔄 Sedang Mengerjakan
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">NIM:</span> {sub.student_nim}
                        </div>
                        <div>
                          <span className="font-medium">Email:</span> {sub.student_email}
                        </div>
                        <div>
                          <span className="font-medium">Submit:</span>{' '}
                          {new Date(sub.created_at).toLocaleString('id-ID')}
                        </div>
                        <div>
                          <span className="font-medium">Selesai:</span>{' '}
                          {sub.completed_at
                            ? new Date(sub.completed_at).toLocaleString('id-ID')
                            : '-'}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/admin/submission/${sub.id}`}>
                        <Button variant="outline" size="sm">
                          <Code2 className="w-4 h-4 mr-2" />
                          Lihat Kode
                        </Button>
                      </Link>
                      {sub.completed_at && (
                        <Link href={`/result/${sub.id}`}>
                          <Button size="sm">
                            <Eye className="w-4 h-4 mr-2" />
                            Lihat Hasil
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}