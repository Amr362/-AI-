import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Play, Download, Upload, Mic, Video, Sparkles } from 'lucide-react'
import './App.css'

function App() {
  const [text, setText] = useState('')
  const [selectedDialect, setSelectedDialect] = useState('')
  const [selectedVoice, setSelectedVoice] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [projectId, setProjectId] = useState(null)

  const dialects = [
    { value: 'msa', label: 'العربية الفصحى' },
    { value: 'egyptian', label: 'المصرية' },
    { value: 'gulf', label: 'الخليجية' },
    { value: 'levantine', label: 'الشامية' },
    { value: 'maghrebi', label: 'المغاربية' }
  ]

  const voices = [
    { value: 'male1', label: 'أحمد - صوت ذكوري هادئ' },
    { value: 'female1', label: 'فاطمة - صوت أنثوي واضح' },
    { value: 'male2', label: 'محمد - صوت ذكوري قوي' },
    { value: 'female2', label: 'عائشة - صوت أنثوي دافئ' }
  ]

  const handleGenerate = async () => {
    setIsGenerating(true)
    setAudioUrl(null)
    setVideoUrl(null)

    try {
      // Step 1: Create a project (to get a project ID)
      const createProjectResponse = await fetch('https://5000-iwzc18wdeyzj7uc6jopt8-0440bc70.manus.computer/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, dialect: selectedDialect, voice: selectedVoice }),
      })
      const projectData = await createProjectResponse.json()

      if (!projectData.success) {
        console.error('Error creating project:', projectData.error)
        alert(`خطأ في إنشاء المشروع: ${projectData.error}`)
        setIsGenerating(false)
        return
      }
      setProjectId(projectData.project.id)

      // Step 2: Generate TTS audio
      const ttsResponse = await fetch('https://5000-iwzc18wdeyzj7uc6jopt8-0440bc70.manus.computer/api/tts/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, voice: selectedVoice }),
      })

      const ttsData = await ttsResponse.json()

      if (ttsData.success) {
        setAudioUrl(`https://5000-iwzc18wdeyzj7uc6jopt8-0440bc70.manus.computer${ttsData.audio_url}`)
      } else {
        console.error('Error generating audio:', ttsData.error)
        alert(`خطأ في توليد الصوت: ${ttsData.error}`)
        setIsGenerating(false)
        return
      }

      // Step 3: Generate video using the project ID
      const videoResponse = await fetch('https://5000-iwzc18wdeyzj7uc6jopt8-0440bc70.manus.computer/api/video/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ project_id: projectData.project.id }),
      })

      const videoData = await videoResponse.json()

      if (videoData.success) {
        setVideoUrl(videoData.video_url)
      } else {
        console.error('Error generating video:', videoData.error)
        alert(`خطأ في توليد الفيديو: ${videoData.error}`)
      }

    } catch (error) {
      console.error('Network error:', error)
      alert('حدث خطأ في الاتصال بالخادم.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-indigo-600" />
            <h1 className="text-4xl font-bold text-gray-900">صانع الفيديو العربي</h1>
            <Sparkles className="h-8 w-8 text-indigo-600" />
          </div>
          <p className="text-xl text-gray-600">حول نصوصك إلى فيديوهات احترافية بالذكاء الاصطناعي</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5" />
                  إدخال النص والإعدادات
                </CardTitle>
                <CardDescription>
                  اكتب النص الذي تريد تحويله إلى فيديو واختر اللهجة والصوت المناسب
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">النص المراد تحويله</label>
                  <Textarea
                    placeholder="اكتب النص هنا... مثال: مرحباً بكم في قناتنا، اليوم سنتحدث عن أهمية التكنولوجيا في حياتنا اليومية"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="min-h-32 text-right"
                    dir="rtl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">اختر اللهجة</label>
                  <Select value={selectedDialect} onValueChange={setSelectedDialect}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر اللهجة المناسبة" />
                    </SelectTrigger>
                    <SelectContent>
                      {dialects.map((dialect) => (
                        <SelectItem key={dialect.value} value={dialect.value}>
                          {dialect.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">اختر الصوت</label>
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الصوت المناسب" />
                    </SelectTrigger>
                    <SelectContent>
                      {voices.map((voice) => (
                        <SelectItem key={voice.value} value={voice.value}>
                          {voice.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleGenerate}
                  disabled={!text || !selectedDialect || !selectedVoice || isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      جاري الإنتاج...
                    </>
                  ) : (
                    <>
                      <Video className="h-4 w-4 mr-2" />
                      إنشاء الفيديو
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Video Library */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  مكتبة الفيديو
                </CardTitle>
                <CardDescription>
                  اختر من مكتبة الفيديوهات الجاهزة أو ارفع فيديو مخصص
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors">
                    <div className="text-center">
                      <Video className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                      <p className="text-sm text-gray-600">فيديو تقني</p>
                    </div>
                  </div>
                  <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors">
                    <div className="text-center">
                      <Video className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                      <p className="text-sm text-gray-600">فيديو تعليمي</p>
                    </div>
                  </div>
                  <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors">
                    <div className="text-center">
                      <Video className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                      <p className="text-sm text-gray-600">فيديو تسويقي</p>
                    </div>
                  </div>
                  <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors border-2 border-dashed border-gray-400">
                    <div className="text-center">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                      <p className="text-sm text-gray-600">رفع فيديو</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  معاينة الفيديو
                </CardTitle>
                <CardDescription>
                  شاهد النتيجة النهائية قبل التحميل
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-black rounded-lg flex items-center justify-center mb-4">
                  {isGenerating ? (
                    <div className="text-center text-white">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                      <p>جاري إنتاج الفيديو...</p>
                    </div>
                  ) : videoUrl ? (
                    <video controls src={videoUrl} className="w-full" />
                  ) : audioUrl ? (
                    <audio controls src={audioUrl} className="w-full" />
                  ) : (
                    <div className="text-center text-gray-400">
                      <Play className="h-16 w-16 mx-auto mb-4" />
                      <p>ستظهر معاينة الفيديو هنا</p>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">
                    <Play className="h-4 w-4 mr-2" />
                    تشغيل
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    تحميل
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <Card>
              <CardHeader>
                <CardTitle>المميزات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">دعم 5+ لهجات عربية</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">أصوات طبيعية عالية الجودة</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">مكتبة فيديوهات متنوعة</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">تصدير بجودة HD و 4K</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">إنتاج سريع وآمن</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App



